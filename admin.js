import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import { getDatabase, onValue, ref } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const loginSection = document.getElementById('loginSection');
const dashboardSection = document.getElementById('dashboardSection');
const loginForm = document.getElementById('loginForm');
const loginStatus = document.getElementById('loginStatus');
const logoutBtn = document.getElementById('logoutBtn');
const policyForm = document.getElementById('policyForm');
const hoursForm = document.getElementById('hoursForm');
const hoursRows = document.getElementById('hoursRows');
const policyStatus = document.getElementById('policyStatus');
const hoursStatus = document.getElementById('hoursStatus');
const totalReservationCount = document.getElementById('totalReservationCount');
const reservationTableBody = document.getElementById('reservationTableBody');

const SESSION_KEY = 'jamsil-admin-auth';
const SETTINGS_KEY = 'jamsil-admin-settings';
const weekdayLabel = ['일', '월', '화', '수', '목', '금', '토'];

const defaultSettings = {
  businessHours: window.APP_CONFIG?.businessHours || {},
  hourlyPricePerPerson: 5000,
  beveragePolicy: '1인당 컵 1개 기준으로 커피 2회 / 물 2회 제공',
  wifiEnabled: true,
  minPeopleBySeat: { '4': 3, '6': 4 },
};

function loadSettings() {
  const stored = JSON.parse(localStorage.getItem(SETTINGS_KEY) || '{}');
  return {
    ...defaultSettings,
    ...stored,
    minPeopleBySeat: {
      ...defaultSettings.minPeopleBySeat,
      ...(stored.minPeopleBySeat || {}),
    },
  };
}

function saveSettings(data) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(data));
}

function setLoginStatus(message, tone = '') {
  loginStatus.className = `form-status ${tone}`.trim();
  loginStatus.textContent = message;
}

function toggleAuthUi(isAuthed) {
  loginSection.style.display = isAuthed ? 'none' : 'block';
  dashboardSection.classList.toggle('admin-hidden', !isAuthed);
}

function renderPolicyForm(settings) {
  policyForm.hourlyPricePerPerson.value = String(settings.hourlyPricePerPerson);
  policyForm.beveragePolicy.value = settings.beveragePolicy;
  policyForm.wifiEnabled.value = String(Boolean(settings.wifiEnabled));
  policyForm.min4.value = String(settings.minPeopleBySeat['4']);
  policyForm.min6.value = String(settings.minPeopleBySeat['6']);
}

function renderHoursForm(settings) {
  hoursRows.innerHTML = weekdayLabel
    .map((day, index) => {
      const h = settings.businessHours[index];
      return `
        <div class="hours-row">
          <strong>${day}요일</strong>
          <label><input type="checkbox" name="closed-${index}" ${h ? '' : 'checked'} /> 휴무</label>
          <label>오픈 <input type="time" name="open-${index}" value="${h?.open || '12:00'}" /></label>
          <label>마감 <input type="time" name="close-${index}" value="${h?.close || '22:00'}" /></label>
        </div>
      `;
    })
    .join('');
}

function loadReservations(callback) {
  const firebaseConfig = window.APP_CONFIG?.firebase || {};
  const isRealtimeReady = Boolean(firebaseConfig.databaseURL && firebaseConfig.apiKey && firebaseConfig.projectId);

  if (isRealtimeReady) {
    const app = initializeApp(firebaseConfig);
    const db = getDatabase(app);
    onValue(ref(db, 'reservations'), (snapshot) => {
      callback(Object.values(snapshot.val() || {}));
    });
    return;
  }

  const localData = JSON.parse(localStorage.getItem('jamsil-cafe-reservations') || '[]');
  callback(localData);
}

function renderReservations(reservations) {
  totalReservationCount.textContent = String(reservations.length);
  reservationTableBody.innerHTML = reservations
    .sort((a, b) => String(b.datetime || '').localeCompare(String(a.datetime || '')))
    .map((r) => `
      <tr>
        <td>${r.datetime || '-'}</td>
        <td>${r.name || '-'}</td>
        <td>${r.phone || '-'}</td>
        <td>${r.seatType || '-'}인석</td>
        <td>${r.people || '-'}</td>
        <td>${r.duration || 1}h</td>
        <td>${Number(r.price || 0).toLocaleString('ko-KR')}원</td>
        <td>${r.source || '-'}</td>
      </tr>
    `)
    .join('');
}

loginForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const formData = new FormData(loginForm);
  const username = String(formData.get('username') || '');
  const password = String(formData.get('password') || '');

  if (username === 'admin' && password === '1234') {
    sessionStorage.setItem(SESSION_KEY, 'true');
    setLoginStatus('로그인 성공', 'success');
    toggleAuthUi(true);

    const settings = loadSettings();
    renderPolicyForm(settings);
    renderHoursForm(settings);
    loadReservations(renderReservations);
  } else {
    setLoginStatus('아이디 또는 비밀번호가 올바르지 않습니다.', 'error');
  }
});

logoutBtn.addEventListener('click', () => {
  sessionStorage.removeItem(SESSION_KEY);
  toggleAuthUi(false);
});

policyForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const settings = loadSettings();
  const formData = new FormData(policyForm);

  settings.hourlyPricePerPerson = Number(formData.get('hourlyPricePerPerson') || 5000);
  settings.beveragePolicy = String(formData.get('beveragePolicy') || '').trim();
  settings.wifiEnabled = String(formData.get('wifiEnabled')) === 'true';
  settings.minPeopleBySeat['4'] = Number(formData.get('min4') || 3);
  settings.minPeopleBySeat['6'] = Number(formData.get('min6') || 4);

  saveSettings(settings);
  policyStatus.className = 'form-status success';
  policyStatus.textContent = '운영 정책이 저장되었습니다. 메인 페이지를 새로고침하면 반영됩니다.';
});

hoursForm.addEventListener('submit', (event) => {
  event.preventDefault();
  const settings = loadSettings();
  const updated = {};

  for (let i = 0; i < 7; i += 1) {
    const isClosed = hoursForm.elements[`closed-${i}`].checked;
    const open = String(hoursForm.elements[`open-${i}`].value || '12:00');
    const close = String(hoursForm.elements[`close-${i}`].value || '22:00');

    if (isClosed) {
      updated[i] = null;
    } else {
      updated[i] = { open, close };
    }
  }

  settings.businessHours = updated;
  saveSettings(settings);
  hoursStatus.className = 'form-status success';
  hoursStatus.textContent = '영업시간 설정이 저장되었습니다. 메인 페이지를 새로고침하면 반영됩니다.';
});

const isAuthed = sessionStorage.getItem(SESSION_KEY) === 'true';
toggleAuthUi(isAuthed);

if (isAuthed) {
  const settings = loadSettings();
  renderPolicyForm(settings);
  renderHoursForm(settings);
  loadReservations(renderReservations);
}
