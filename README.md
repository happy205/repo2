# 잠실 장미상가 프라이빗 예약제 카페 웹사이트

GitHub Pages에 배포 가능한 정적 웹사이트입니다.

## 반영된 요구사항
- 다양한 원산지의 드립 커피 원두 제공 안내
- 1인당 컵 1개 기준, 예약 시간 동안 **커피 2회 + 물 2회 제공** 정책 반영
- 시간 단위 예약 + 예상 요금 계산
- 요금: **1시간 기준 1인 5,000원**
- 무료 Wi-Fi 제공 안내
- 좌석 제약: **4인석은 3인 이상**, **6인석은 4인 이상**

## 최신 트렌드 반영 UX
최근 카페/브랜드 사이트 트렌드는 다음을 권장합니다.
1. 예약/구매 전환은 홈에서 즉시 가능하게 유지
2. 상세 정보(원두, 이용 가이드)는 분리 페이지로 정보 밀도 확보
3. 상단 메뉴로 빠른 이동 제공

이 프로젝트는 위 트렌드를 반영해 다음처럼 구성했습니다.
- `index.html`: 소개 + 운영정책 + 예약 전환
- `beans.html`: 원두 스토리/산지 소개
- `guide.html`: 이용 가이드/규정 안내

즉, **별도 페이지 + 별도 메뉴** 구성이 가장 적합합니다.

## 파일 구조
- `index.html`: 메인/예약 페이지
- `beans.html`: 원두 소개 페이지
- `guide.html`: 이용 가이드 페이지
- `styles.css`: 공통 스타일
- `script.js`: 예약 로직(검증/잔여 계산/저장소 연동)
- `config.js`: Firebase + 영업시간 설정
- `workers/naver-sync-worker.js`: 네이버 예약 이벤트를 Firebase로 반영하는 서버리스 예시

## 설정(config.js)
요일별 영업시간과 Firebase 설정을 관리합니다.

```js
window.APP_CONFIG = {
  firebase: {
    apiKey: '...',
    authDomain: '...',
    databaseURL: 'https://<project>-default-rtdb.<region>.firebasedatabase.app',
    projectId: '...',
    storageBucket: '...',
    messagingSenderId: '...',
    appId: '...',
  },
  businessHours: {
    0: null,
    1: { open: '12:00', close: '22:00' },
    2: { open: '12:00', close: '22:00' },
    3: { open: '12:00', close: '22:00' },
    4: { open: '12:00', close: '22:00' },
    5: { open: '12:00', close: '23:00' },
    6: { open: '11:00', close: '23:00' },
  },
};
```

## 로컬 실행
```bash
python3 -m http.server 4173
```
브라우저에서 `http://localhost:4173` 접속
