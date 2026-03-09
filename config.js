// 배포 전 Firebase 값을 채우면 실시간 동기화 모드로 동작합니다.
// businessHours: 요일별 영업시간 (0:일 ~ 6:토), close 시간은 마지막 예약 시작 가능 시간의 다음 시각입니다.
window.APP_CONFIG = {
  firebase: {
    apiKey: '',
    authDomain: '',
    databaseURL: '',
    projectId: '',
    storageBucket: '',
    messagingSenderId: '',
    appId: '',
  },
  businessHours: {
    0: null, // 일요일 휴무
    1: { open: '12:00', close: '22:00' },
    2: { open: '12:00', close: '22:00' },
    3: { open: '12:00', close: '22:00' },
    4: { open: '12:00', close: '22:00' },
    5: { open: '12:00', close: '23:00' },
    6: { open: '11:00', close: '23:00' },
  },
};
