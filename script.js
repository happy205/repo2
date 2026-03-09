import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js';
import {
  getDatabase,
  onValue,
  push,
  ref,
  serverTimestamp,
} from 'https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js';

const form = document.getElementById('reservationForm');
const statusEl = document.getElementById('formStatus');
const reservationCountEl = document.getElementById('reservationCount');
const availabilityList = document.getElementById('availabilityList');
const syncBadge = document.getElementById('syncBadge');
const dateInput = document.getElementById('dateInput');
const hourInput = document.getElementById('hourInput');
const businessHoursList = document.getElementById('businessHoursList');
const estimatedPriceEl = document.getElementById('estimatedPrice');
const priceSummaryEl = document.getElementById('priceSummary');
const beverageSummaryEl = document.getElementById('beverageSummary');
const wifiSummaryEl = document.getElementById('wifiSummary');
const seat4SummaryEl = document.getElementById('seat4Summary');
const seat6SummaryEl = document.getElementById('seat6Summary');

const seatInventory = { '1': 50, '2': 10, '4': 2, '6': 2 };
const seatLabel = { '1': '1인석', '2': '2인석', '4': '4인석', '6': '6인석' };
const weekdayLabel = ['일', '월', '화', '수', '목', '금', '토'];

const defaultSettings = {
  businessHours: window.APP_CONFIG?.businessHours || {},
  hourlyPricePerPerson: 5000,
  beveragePolicy: '1인당 컵 1개 기준으로 커피 2회 / 물 2회 제공',
  wifiEnabled: true,
  minPeopleBySeat: { '4': 3, '6': 4 },
};

function loadRuntimeSettings() {
  const stored = JSON.parse(localStorage.getItem('jamsil-admin-settings') || '{}');
  return {
    ...defaultSettings,
    ...stored,
    minPeopleBySeat: {
      ...defaultSettings.minPeopleBySeat,
      ...(stored.minPeopleBySeat || {}),
    },
  };
}

const settings = loadRuntimeSettings();
const businessHours = settings.businessHours || {};
const hourlyPricePerPerson = Number(settings.hourlyPricePerPerson) || 5000;
let allReservations = [];

function applyPolicyToUi() {
  if (priceSummaryEl) {
    priceSummaryEl.innerHTML = `1시간 기준 1인 <strong>${hourlyPricePerPerson.toLocaleString('ko-KR')}원</strong>`;
  }
  if (beverageSummaryEl) {
    beverageSummaryEl.textContent = settings.beveragePolicy;
  }
  if (wifiSummaryEl) {
    wifiSummaryEl.textContent = settings.wifiEnabled ? '무료 Wi-Fi 제공' : 'Wi-Fi 미제공';
  }
  if (seat4SummaryEl) {
    seat4SummaryEl.textContent = `${settings.minPeopleBySeat['4']}인 이상부터 이용`;
  }
  if (seat6SummaryEl) {
    seat6SummaryEl.textContent = `${settings.minPeopleBySeat['6']}인 이상부터 이용`;
  }
}

function getSlotKey(datetime) {
  return String(datetime || '').slice(0, 13);
}

function buildDatetime(date, hour) {
  return `${date}T${hour}:00`;
}

function parseHourToNumber(time) {
  return Number(String(time).slice(0, 2));
}

function getBusinessHourForDate(dateText) {
  if (!dateText) {
    return null;
  }
  const weekday = new Date(`${dateText}T00:00:00`).getDay();
  return businessHours[weekday] || null;
}

function renderBusinessHours() {
  if (!businessHoursList) {
    return;
  }

  businessHoursList.innerHTML = weekdayLabel
    .map((day, index) => {
      const item = businessHours[index];
      const text = item ? `${item.open} ~ ${item.close}` : '휴무';
      return `<li>${day}요일: ${text}</li>`;
    })
    .join('');
}

function renderHourOptions(dateText) {
  const dayHours = getBusinessHourForDate(dateText);

  if (!dayHours) {
    hourInput.innerHTML = '<option value="">해당 요일은 휴무입니다</option>';
    hourInput.disabled = true;
    return;
  }

  const openHour = parseHourToNumber(dayHours.open);
  const closeHour = parseHourToNumber(dayHours.close);
  const options = [];

  for (let hour = openHour; hour < closeHour; hour += 1) {
    const formatted = String(hour).padStart(2, '0');
    options.push(`<option value="${formatted}">${formatted}:00</option>`);
  }

  hourInput.innerHTML = options.join('');
  hourInput.disabled = options.length === 0;
}

function getSelectedSlotKey() {
  if (!dateInput.value || !hourInput.value) {
    return '';
  }
  return getSlotKey(buildDatetime(dateInput.value, hourInput.value));
}

function renderAvailability() {
  const slotKey = getSelectedSlotKey();
  const scoped = slotKey
    ? allReservations.filter((reservation) => getSlotKey(reservation.datetime) === slotKey)
    : allReservations;

  const used = { '1': 0, '2': 0, '4': 0, '6': 0 };

  scoped.forEach((reservation) => {
    if (used[reservation.seatType] !== undefined) {
      used[reservation.seatType] += 1;
    }
  });

  reservationCountEl.textContent = String(scoped.length);
  availabilityList.innerHTML = Object.keys(seatInventory)
    .map((type) => {
      const remain = Math.max(seatInventory[type] - used[type], 0);
      return `<li>${seatLabel[type]}: ${remain}석 남음 (총 ${seatInventory[type]}석)</li>`;
    })
    .join('');
}

function updateEstimatedPrice() {
  const formData = new FormData(form);
  const people = Number(formData.get('people') || 0);
  const duration = Number(formData.get('duration') || 0);
  const price = people * duration * hourlyPricePerPerson;
  estimatedPriceEl.textContent = `${price.toLocaleString('ko-KR')}원`;
}

function setStatus(message, tone = '') {
  statusEl.className = `form-status ${tone}`.trim();
  statusEl.textContent = message;
}

function validatePayload(payload) {
  if (!payload.name || !payload.phone || !payload.datetime || !payload.date || !payload.hour) {
    return '필수 항목을 모두 입력해주세요.';
  }

  if (payload.duration < 1) {
    return '예약 시간은 최소 1시간 이상 선택해주세요.';
  }

  if (payload.people > Number(payload.seatType)) {
    return `${seatLabel[payload.seatType]}은 최대 ${payload.seatType}인까지 예약할 수 있습니다.`;
  }

  if (payload.seatType === '4' && payload.people < Number(settings.minPeopleBySeat['4'])) {
    return `4인석은 ${settings.minPeopleBySeat['4']}인 이상부터 예약 가능합니다.`;
  }

  if (payload.seatType === '6' && payload.people < Number(settings.minPeopleBySeat['6'])) {
    return `6인석은 ${settings.minPeopleBySeat['6']}인 이상부터 예약 가능합니다.`;
  }

  const dayHours = getBusinessHourForDate(payload.date);
  if (!dayHours) {
    return '선택한 날짜는 휴무일입니다.';
  }

  const selectedHour = Number(payload.hour);
  const openHour = parseHourToNumber(dayHours.open);
  const closeHour = parseHourToNumber(dayHours.close);
  if (selectedHour < openHour || selectedHour >= closeHour) {
    return `해당 날짜 예약 가능 시간은 ${dayHours.open} ~ ${dayHours.close} 입니다.`;
  }

  return '';
}

function createLocalStore() {
  const KEY = 'jamsil-cafe-reservations';
  return {
    mode: 'local',
    subscribe(callback) {
      const data = JSON.parse(localStorage.getItem(KEY) || '[]');
      callback(data);
    },
    async create(payload) {
      const data = JSON.parse(localStorage.getItem(KEY) || '[]');
      data.push({ ...payload, id: crypto.randomUUID(), createdAt: Date.now() });
      localStorage.setItem(KEY, JSON.stringify(data));
      return data;
    },
  };
}

function createFirebaseStore(firebaseConfig) {
  const app = initializeApp(firebaseConfig);
  const db = getDatabase(app);
  return {
    mode: 'firebase',
    subscribe(callback) {
      onValue(ref(db, 'reservations'), (snapshot) => {
        const data = snapshot.val() || {};
        callback(Object.values(data));
      });
    },
    async create(payload) {
      await push(ref(db, 'reservations'), { ...payload, createdAt: serverTimestamp() });
    },
  };
}

const firebaseConfig = window.APP_CONFIG?.firebase || {};
const isRealtimeReady = Boolean(firebaseConfig.databaseURL && firebaseConfig.apiKey && firebaseConfig.projectId);
const store = isRealtimeReady ? createFirebaseStore(firebaseConfig) : createLocalStore();

if (syncBadge) {
  syncBadge.textContent = isRealtimeReady
    ? '동기화 모드: Firebase Realtime (홈페이지 + 네이버 예약 통합)'
    : '데모 모드: config.js 미설정으로 브라우저 로컬 저장소 사용 중';
}

applyPolicyToUi();
renderBusinessHours();

const today = new Date().toISOString().slice(0, 10);
dateInput.min = today;
dateInput.value = today;
renderHourOptions(today);
updateEstimatedPrice();

store.subscribe((reservations) => {
  allReservations = reservations;
  renderAvailability();
});

dateInput.addEventListener('change', () => {
  renderHourOptions(dateInput.value);
  renderAvailability();
});

hourInput.addEventListener('change', renderAvailability);
form.addEventListener('input', updateEstimatedPrice);

form.addEventListener('submit', async (event) => {
  event.preventDefault();
  const formData = new FormData(form);
  const date = String(formData.get('date') || '');
  const hour = String(formData.get('hour') || '');
  const people = Number(formData.get('people') || 1);
  const duration = Number(formData.get('duration') || 1);

  const payload = {
    source: 'website',
    name: String(formData.get('name') || '').trim(),
    phone: String(formData.get('phone') || '').trim(),
    seatType: String(formData.get('seatType') || '1'),
    people,
    duration,
    date,
    hour,
    datetime: date && hour ? buildDatetime(date, hour) : '',
    price: people * duration * hourlyPricePerPerson,
    beveragePolicy: settings.beveragePolicy,
  };

  const validationMessage = validatePayload(payload);
  if (validationMessage) {
    setStatus(validationMessage, 'error');
    return;
  }

  const targetSlot = getSlotKey(payload.datetime);
  const slotReservations = allReservations.filter(
    (reservation) => reservation.seatType === payload.seatType && getSlotKey(reservation.datetime) === targetSlot,
  );

  if (slotReservations.length >= seatInventory[payload.seatType]) {
    setStatus(`${seatLabel[payload.seatType]}이 해당 시간대에 모두 예약되었습니다.`, 'error');
    return;
  }

  try {
    const result = await store.create(payload);
    if (store.mode === 'local') {
      allReservations = result;
      renderAvailability();
    }
    setStatus('예약 요청이 등록되었습니다. 확인 후 연락드릴게요!', 'success');
    form.reset();
    dateInput.value = today;
    renderHourOptions(today);
    updateEstimatedPrice();
  } catch (error) {
    setStatus('등록 중 오류가 발생했습니다. 잠시 후 다시 시도해주세요.', 'error');
    console.error(error);
  }
});
