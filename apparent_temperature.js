/**
 * 기상청 여름철 데이터 패턴 기반 체감온도 예측 선형회귀 모듈
 */

/**
 * 여름철 기온, 습도, 풍속을 기반으로 체감온도를 예측하는 선형회귀 함수
 * 
 * @param {number} temperature - 현재 기온 (섭씨, °C)
 * @param {number} humidity - 상대습도 (%)
 * @param {number} windSpeed - 풍속 (m/s)
 * @returns {number} 예측된 체감온도 (°C, 소수점 첫째자리 반올림)
 */
function predictApparentTemperature(temperature, humidity, windSpeed) {
  // 입력값 예외 처리
  if (typeof temperature !== 'number' || typeof humidity !== 'number' || typeof windSpeed !== 'number') {
    throw new TypeError('모든 입력값(기온, 습도, 풍속)은 숫자형(number)이어야 합니다.');
  }

  // 선형회귀 절편(Intercept) 및 계수(Coefficients)
  const intercept = -1.2;
  const coefTemperature = 0.95;
  const coefHumidity = 0.08;
  const coefWindSpeed = -0.45;

  // 선형회귀 방정식 계산: T_app = -1.2 + (0.95 * T) + (0.08 * H) - (0.45 * V)
  const apparentTemp = intercept 
    + (coefTemperature * temperature) 
    + (coefHumidity * humidity) 
    + (coefWindSpeed * windSpeed);

  // 소수점 첫째 자리까지 반올림
  return Math.round(apparentTemp * 10) / 10;
}

// Node.js 환경(CommonJS)과 브라우저(전역 객체) 환경 모두 지원
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { predictApparentTemperature };
}
