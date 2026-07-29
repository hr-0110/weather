/**
 * 기상청 초단기실황 API 연동 및 체감온도 자동 예측 스크립트
 * (IP 기반 위치 및 시간대별 동적 배경 테마 & 이모지 자동 연동)
 */

const API_KEY = 'ced4ddfa5dc64a4af68306672bb635aac22e3c16551f7301e2a924910a733974';

// DOM 요소
const headerEmoji = document.getElementById('headerEmoji');
const statusBadge = document.getElementById('statusBadge');
const apparentTempValue = document.getElementById('apparentTempValue');
const statusDesc = document.getElementById('statusDesc');
const obsTime = document.getElementById('obsTime');

const realTemp = document.getElementById('realTemp');
const realHumidity = document.getElementById('realHumidity');
const realWind = document.getElementById('realWind');
const locationInfo = document.getElementById('locationInfo');
const refreshBtn = document.getElementById('refreshBtn');

/**
 * 현재 시간(0~23시)에 맞춰 body 배경 테마 클래스 및 제목 이모지 자동 변경
 * - 일출/일몰 (06시~08시 / 18시~20시): theme-sunrise, 🌅 (일출/일몰 노을)
 * - 낮 (08시~18시): theme-day, ☀️ (화사한 태양)
 * - 밤/새벽 (20시~06시): theme-night, 🌙 (초승달)
 */
function updateTimeBasedTheme() {
  const currentHour = new Date().getHours();
  const body = document.body;

  // 기존 테마 클래스 제거
  body.classList.remove('theme-sunrise', 'theme-day', 'theme-night');

  if ((currentHour >= 6 && currentHour < 8) || (currentHour >= 18 && currentHour < 20)) {
    body.classList.add('theme-sunrise');
    if (headerEmoji) headerEmoji.textContent = '🌅';
  } else if (currentHour >= 8 && currentHour < 18) {
    body.classList.add('theme-day');
    if (headerEmoji) headerEmoji.textContent = '☀️';
  } else {
    body.classList.add('theme-night');
    if (headerEmoji) headerEmoji.textContent = '🌙'; // 초승달 이모지 적용
  }
}

/**
 * 위경도 좌표를 기상청 격자 좌표(X, Y)로 변환하는 LCC DFS 함수
 */
function dfs_xy_conv(code, v1, v2) {
  const RE = 6371.00877; // 지구 반경(km)
  const GRID = 5.0; // 격자 간격(km)
  const SLAT1 = 30.0; // 투영 위도1(degree)
  const SLAT2 = 60.0; // 투영 위도2(degree)
  const OLON = 126.0; // 기준점 경도(degree)
  const OLAT = 38.0; // 기준점 위도(degree)
  const XO = 43; // 기준점 X좌표(GRID)
  const YO = 136; // 기준점 Y좌표(GRID)

  const DEGRAD = Math.PI / 180.0;

  const re = RE / GRID;
  const slat1 = SLAT1 * DEGRAD;
  const slat2 = SLAT2 * DEGRAD;
  const olon = OLON * DEGRAD;
  const olat = OLAT * DEGRAD;

  let sn = Math.tan(Math.PI * 0.25 + slat2 * 0.5) / Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sn = Math.log(Math.cos(slat1) / Math.cos(slat2)) / Math.log(sn);
  let sf = Math.tan(Math.PI * 0.25 + slat1 * 0.5);
  sf = (Math.pow(sf, sn) * Math.cos(slat1)) / sn;
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5);
  ro = (re * sf) / Math.pow(ro, sn);

  const rs = {};
  if (code === "toXY") {
    rs['lat'] = v1;
    rs['lng'] = v2;
    let ra = Math.tan(Math.PI * 0.25 + (v1) * DEGRAD * 0.5);
    ra = (re * sf) / Math.pow(ra, sn);
    let theta = v2 * DEGRAD - olon;
    if (theta > Math.PI) theta -= 2.0 * Math.PI;
    if (theta < -Math.PI) theta += 2.0 * Math.PI;
    theta *= sn;
    rs['x'] = Math.floor(ra * Math.sin(theta) + XO + 0.5);
    rs['y'] = Math.floor(ro - ra * Math.cos(theta) + YO + 0.5);
  }
  return rs;
}

/**
 * 기상청 발표 기준시각(base_date, base_time) 계산 함수
 */
function getBaseDateTime() {
  const now = new Date();
  let year = now.getFullYear();
  let month = now.getMonth() + 1;
  let day = now.getDate();
  let hours = now.getHours();
  let minutes = now.getMinutes();

  if (minutes < 40) {
    hours -= 1;
    if (hours < 0) {
      hours = 23;
      const yesterday = new Date(now.setDate(now.getDate() - 1));
      year = yesterday.getFullYear();
      month = yesterday.getMonth() + 1;
      day = yesterday.getDate();
    }
  }

  const base_date = `${year}${month < 10 ? '0' + month : month}${day < 10 ? '0' + day : day}`;
  const base_time = `${hours < 10 ? '0' + hours : hours}00`;

  return { base_date, base_time, formattedTime: `${hours}:00` };
}

/**
 * 체감온도 계산 함수 (선형회귀 공식)
 */
function calculateApparentTemperature(temp, humidity, windSpeed) {
  const intercept = -1.2;
  const coefTemp = 0.95;
  const coefHumidity = 0.08;
  const coefWind = -0.45;

  const result = intercept + (coefTemp * temp) + (coefHumidity * humidity) + (coefWind * windSpeed);
  return Math.round(result * 10) / 10;
}

/**
 * 위험 단계 및 상태 업데이트
 */
function updateStatusTheme(apparentTemp) {
  let badgeText = '안전';
  let descText = '활동하기 쾌적하고 안전한 체감온도입니다.';
  let themeVar = 'var(--theme-safe)';

  if (apparentTemp >= 38) {
    badgeText = '극심한 위험';
    descText = '야외 활동을 자제하고 시원한 실내에 머무르세요!';
    themeVar = 'var(--theme-extreme)';
  } else if (apparentTemp >= 35) {
    badgeText = '위험';
    descText = '온열질환 발생 위험이 매우 높습니다.';
    themeVar = 'var(--theme-danger)';
  } else if (apparentTemp >= 33) {
    badgeText = '경고';
    descText = '장시간 야외 활동 시 온열질환 주의가 필요합니다.';
    themeVar = 'var(--theme-warning)';
  } else if (apparentTemp >= 31) {
    badgeText = '주의';
    descText = '수분을 충분히 섭취하고 휴식을 취하세요.';
    themeVar = 'var(--theme-caution)';
  }

  statusBadge.textContent = badgeText;
  statusDesc.textContent = descText;
  document.documentElement.style.setProperty('--current-theme', themeVar);
}

/**
 * 기상청 API 데이터 불러오기
 */
async function fetchWeatherData(nx, ny) {
  const { base_date, base_time, formattedTime } = getBaseDateTime();

  const url = `https://apis.data.go.kr/1360000/VilageFcstInfoService_2.0/getUltraSrtNcst?serviceKey=${API_KEY}&pageNo=1&numOfRows=1000&dataType=JSON&base_date=${base_date}&base_time=${base_time}&nx=${nx}&ny=${ny}`;

  try {
    statusBadge.textContent = '조회 중...';
    statusDesc.textContent = '기상청 데이터 수신 중입니다.';

    const response = await fetch(url);
    if (!response.ok) throw new Error('API 응답 에러');

    const data = await response.json();
    const items = data?.response?.body?.items?.item;

    if (!items) throw new Error('기상 데이터 형식 오류');

    let temp = null;
    let humidity = null;
    let wind = null;

    items.forEach(item => {
      if (item.category === 'T1H') temp = parseFloat(item.obsrValue);     // 기온
      if (item.category === 'REH') humidity = parseFloat(item.obsrValue); // 습도
      if (item.category === 'WSD') wind = parseFloat(item.obsrValue);     // 풍속
    });

    if (temp !== null && humidity !== null && wind !== null) {
      realTemp.textContent = temp.toFixed(1);
      realHumidity.textContent = humidity;
      realWind.textContent = wind.toFixed(1);

      const apparentTemp = calculateApparentTemperature(temp, humidity, wind);
      apparentTempValue.textContent = apparentTemp.toFixed(1);

      updateStatusTheme(apparentTemp);
      obsTime.textContent = `관측 기준시간: ${base_date.slice(0, 4)}.${base_date.slice(4, 6)}.${base_date.slice(6, 8)} ${formattedTime}`;
    } else {
      throw new Error('필수 기상 항목 누락');
    }

  } catch (error) {
    console.error('날씨 데이터 불러오기 실패:', error);
    statusBadge.textContent = '조회 실패';
    statusDesc.textContent = '기상청 데이터를 불러오는 중 오류가 발생했습니다.';
  }
}

/**
 * IP 주소 기반 위치 조회
 */
async function loadWeatherByIP() {
  // 시간대 배경 및 이모지 업데이트
  updateTimeBasedTheme();

  locationInfo.textContent = '🌐 IP 주소 기반으로 위치를 확인 중입니다...';

  try {
    const response = await fetch('https://ipapi.co/json/');
    if (!response.ok) throw new Error('IP 위치 조회 실패');

    const ipData = await response.json();
    const lat = ipData.latitude;
    const lng = ipData.longitude;
    const city = ipData.city || ipData.region || '현재 지역';

    if (!lat || !lng) throw new Error('위경도 정보 없음');

    const grid = dfs_xy_conv('toXY', lat, lng);
    locationInfo.textContent = `🌐 IP 추정 위치: ${city} (위도 ${lat.toFixed(2)}°, 경도 ${lng.toFixed(2)}° / 격자 X:${grid.x}, Y:${grid.y})`;

    fetchWeatherData(grid.x, grid.y);

  } catch (error) {
    console.warn('IP 위치 조회 실패, GPS/기본 위치 시도:', error);
    loadWeatherByGPS();
  }
}

/**
 * GPS 기반 위치 조회 (폴백)
 */
function loadWeatherByGPS() {
  if ('geolocation' in navigator) {
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        const grid = dfs_xy_conv('toXY', lat, lng);

        locationInfo.textContent = `📍 GPS 위치: 위도 ${lat.toFixed(2)}°, 경도 ${lng.toFixed(2)}° (격자 X:${grid.x}, Y:${grid.y})`;
        fetchWeatherData(grid.x, grid.y);
      },
      (error) => {
        console.warn('GPS 위치 접근 실패, 서울 기본 위치 설정:', error);
        locationInfo.textContent = '📍 위치: 기본 위치 (서울 x:60, y:127)';
        fetchWeatherData(60, 127);
      }
    );
  } else {
    locationInfo.textContent = '📍 위치: 기본 위치 (서울 x:60, y:127)';
    fetchWeatherData(60, 127);
  }
}

// 새로고침 버튼 이벤트
refreshBtn.addEventListener('click', loadWeatherByIP);

// 페이지 로드 시 초기화
loadWeatherByIP();
