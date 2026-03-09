/**
 * Cloudflare Worker 예시
 * - 네이버 예약 이벤트를 받아 Firebase Realtime Database에 반영
 * - 실제 네이버 연동 시 이벤트 스키마에 맞게 파싱 로직을 조정하세요.
 *
 * 필요 시크릿 (Worker env):
 * - NAVER_SYNC_TOKEN
 * - FIREBASE_DB_URL (예: https://xxx-default-rtdb.asia-southeast1.firebasedatabase.app)
 * - FIREBASE_DB_SECRET (Database secret 또는 Admin 인증 토큰)
 */
export default {
  async fetch(request, env) {
    if (request.method !== 'POST') {
      return new Response('Method Not Allowed', { status: 405 });
    }

    const auth = request.headers.get('x-sync-token');
    if (!auth || auth !== env.NAVER_SYNC_TOKEN) {
      return new Response('Unauthorized', { status: 401 });
    }

    const body = await request.json();
    const reservation = {
      source: 'naver',
      name: body.name,
      phone: body.phone,
      seatType: String(body.seatType || '2'),
      people: Number(body.people || 2),
      datetime: body.datetime,
      externalId: body.bookingId,
      createdAt: Date.now(),
    };

    if (!reservation.datetime || !reservation.externalId) {
      return new Response('Bad Request', { status: 400 });
    }

    const endpoint = `${env.FIREBASE_DB_URL}/reservations/${reservation.externalId}.json?auth=${env.FIREBASE_DB_SECRET}`;
    const firebaseResponse = await fetch(endpoint, {
      method: 'PUT',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(reservation),
    });

    if (!firebaseResponse.ok) {
      const text = await firebaseResponse.text();
      return new Response(`Firebase error: ${text}`, { status: 502 });
    }

    return Response.json({ ok: true, upsertedId: reservation.externalId });
  },
};
