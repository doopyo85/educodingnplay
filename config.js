require('dotenv').config();

// 기본 URL 설정
const BASE_URL = process.env.BASE_URL || 'https://app.codingnplay.co.kr';

// 서버 설정
const SERVER = {
  PORT: parseInt(process.env.PORT || '3000'),
  ENV: process.env.NODE_ENV || 'development',
  PRODUCTION: process.env.NODE_ENV === 'production',
};

// Redis 설정
const REDIS = {
  URL: process.env.REDIS_URL || 'redis://localhost:6379',
  PREFIX: process.env.REDIS_PREFIX || 'educodingnplay:sess:',
};

// 세션 설정
const SESSION = {
  SECRET: process.env.EXPRESS_SESSION_SECRET || 'your_fallback_secret',
  COOKIE: {
    MAX_AGE: parseInt(process.env.SESSION_MAX_AGE || (60 * 60 * 1000).toString()), // 기본값 1시간
    DOMAIN: process.env.COOKIE_DOMAIN || '.codingnplay.co.kr',
  },
};

// JWT 설정
const JWT = {
  SECRET: process.env.JWT_SECRET || 'your_jwt_secret',
  EXPIRES_IN: process.env.JWT_EXPIRES_IN || '1h',
};

// 외부 API 엔드포인트
const API_ENDPOINTS = {
  GOOGLE_SHEETS: 'https://sheets.googleapis.com',
  S3_BUCKET: 'https://educodingnplaycontents.s3.amazonaws.com',
};

// S3 설정
const S3 = {
  REGION: process.env.AWS_REGION || 'ap-northeast-2',
  BUCKET_NAME: process.env.BUCKET_NAME || 'educodingnplaycontents',
};

// Google API 설정
const GOOGLE_API = {
  KEY: process.env.GOOGLE_API_KEY,
  SPREADSHEET_ID: process.env.SPREADSHEET_ID,
  DISCOVERY_DOCS: [process.env.DISCOVERY_DOCS || 'https://sheets.googleapis.com/$discovery/rest?version=v4'],
};

// CORS 설정
const CORS = {
  ALLOWED_ORIGINS: [
    'https://codingnplay.co.kr',
    'https://www.codingnplay.co.kr',
    'https://app.codingnplay.co.kr',  // app 도메인이 기존에 포함되어 있음
    'http://codingnplay.co.kr',
    'http://www.codingnplay.co.kr',
    'http://app.codingnplay.co.kr',   // HTTP 버전도 추가
    undefined  // 같은 origin 요청 허용
  ],
};

// CSP(Content-Security-Policy) 설정
const CSP = {
  DEFAULT_SRC: ["'self'"],
  FONT_SRC: ["'self'", "data:", "https://cdnjs.cloudflare.com", "https://fonts.googleapis.com", "https://fonts.gstatic.com", "https://cdn.jsdelivr.net"],
  SCRIPT_SRC: ["'self'", "'unsafe-inline'", "'unsafe-eval'", "https://apis.google.com", "https://code.jquery.com", "https://cdn.jsdelivr.net", "https://unpkg.com", "https://cdnjs.cloudflare.com", "https://playentry.org"],
  STYLE_SRC: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://playentry.org"],
  IMG_SRC: ["'self'", "data:", "https://educodingnplaycontents.s3.amazonaws.com", "https://educodingnplaycontents.s3.ap-northeast-2.amazonaws.com", "https://www.google.com", "https://code.org", "https://blockly.games", "https://playentry.org"],
  CONNECT_SRC: ["'self'", "https://apis.google.com", "https://content-sheets.googleapis.com", "https://educodingnplaycontents.s3.amazonaws.com", "https://educodingnplaycontents.s3.ap-northeast-2.amazonaws.com", "https://www.google.com", "https://cdn.jsdelivr.net", "https://cdnjs.cloudflare.com", "https://playentry.org"],
  // FRAME_SRC 업데이트 - report 경로 추가
  FRAME_SRC: [
    "'self'", 
    "https://docs.google.com", 
    "https://sheets.googleapis.com", 
    "https://content-sheets.googleapis.com", 
    "https://educodingnplaycontents.s3.amazonaws.com", 
    "https://app.codingnplay.co.kr:8080", 
    "https://app.codingnplay.co.kr", 
    "https://app.codingnplay.co.kr/report/",
    "https://playentry.org"
  ],
  WORKER_SRC: ["'self'", "blob:"],
  OBJECT_SRC: ["'none'"],
};

// 사용자 역할 정의
const Roles = {
  ADMIN: 'admin',
  TEACHER: 'teacher',
  MANAGER: 'manager',
  STUDENT: 'student',
  KINDER: 'kinder',
  SCHOOL: 'school',
  GUEST: 'guest',
};

// 서비스 포트 설정
const SERVICES = {
  SCRATCH: `${BASE_URL}:8601`,
  ENTRY: `${BASE_URL}:8080`,
};

// 크론 작업 설정
const CRON = {
  SUBSCRIPTION_UPDATE: '0 0 * * *', // 매일 자정
};

// 설정 내보내기
module.exports = {
  BASE_URL,
  SERVER,
  REDIS,
  SESSION,
  JWT,
  API_ENDPOINTS,
  S3,
  GOOGLE_API,
  CORS,
  CSP,
  Roles,
  SERVICES,
  CRON,
  
  // 전체 CSP 문자열 생성 함수
  getCSPString: () => {
    return Object.entries(CSP)
      .map(([key, values]) => {
        // CSP 키를 HTTP 헤더 형식으로 변환 (예: DEFAULT_SRC -> default-src)
        const directive = key.replace(/_/g, '-').toLowerCase();
        return `${directive} ${values.join(' ')}`;
      })
      .join('; ');
  }
};