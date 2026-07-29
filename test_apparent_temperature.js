/**
 * apparent_temperature.js 테스트 스크립트
 */
const { predictApparentTemperature } = require('./apparent_temperature.js');

console.log('==== 체감온도 예측 함수 테스트 시작 ====\n');

// 테스트 케이스 목록
const testCases = [
  { temp: 30, hum: 75, wind: 1.5, expected: 32.6, desc: '여름철 일반적인 날씨 (기온 30°C, 습도 75%, 풍속 1.5m/s)' },
  { temp: 35, hum: 85, wind: 0.5, expected: 38.6, desc: '폭염 및 고습도 날씨 (기온 35°C, 습도 85%, 풍속 0.5m/s)' },
  { temp: 25, hum: 50, wind: 3.0, expected: 25.2, desc: '쾌적한 여름 날씨 (기온 25°C, 습도 50%, 풍속 3.0m/s)' }
];

let passedCount = 0;

testCases.forEach((tc, index) => {
  const result = predictApparentTemperature(tc.temp, tc.hum, tc.wind);
  const isPassed = result === tc.expected;
  
  if (isPassed) passedCount++;

  console.log(`[테스트 ${index + 1}] ${tc.desc}`);
  console.log(`- 입력값: 기온=${tc.temp}°C, 습도=${tc.hum}%, 풍속=${tc.wind}m/s`);
  console.log(`- 예측 결과: ${result}°C (기대값: ${tc.expected}°C)`);
  console.log(`- 결과 상태: ${isPassed ? '✅ 성공' : '❌ 실패'}\n`);
});

console.log(`==== 테스트 완료: 총 ${testCases.length}개 중 ${passedCount}개 통과 ====`);
