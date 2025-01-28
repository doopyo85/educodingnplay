// server.js exports 부분을 다음과 같이 구조화
module.exports = {
  // Google Sheets 관련
  getSheetData,

  // 시스템 설정
  config: {
      BASE_URL: 'https://app.codingnplay.co.kr',
      S3_URL: 'https://educodingnplaycontents.s3.ap-northeast-2.amazonaws.com',
      API_ENDPOINTS: {
          CENTER_LIST: '/center/api/get-center-list'
      }
  },

  // 필요한 경우 다른 카테고리도 추가 가능
  utils: {
      // 유틸리티 함수들
  },
  
  constants: {
      // 상수값들
  }
};