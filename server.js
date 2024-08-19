const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');
const db = require('./lib_login/db'); // MySQL 연결 설정 파일
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const authRouter = require('./lib_login/auth'); // authRouter를 가져오는 코드 추가
const { exec } = require('child_process');

// JWT 비밀키 설정
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const app = express();

// AWS S3 설정
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'ap-northeast-2'
});

const BUCKET_NAME = 'educodingnplaycontents';

// Redis 클라이언트 설정
const redisClient = redis.createClient({ url: 'redis://localhost:6379' });
redisClient.connect().catch(console.error);

// 세션 스토어 설정
const store = new RedisStore({ client: redisClient });

// CORS 설정
app.use(cors({
  origin: 'https://codingnplay.site', // HTTPS로 변경
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Content Security Policy 헤더 설정
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", 
    "default-src 'self'; " +
    "font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://code.jquery.com https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "img-src 'self' data:; " +
    "connect-src 'self' https://apis.google.com https://content-sheets.googleapis.com; " +
    "frame-src 'self' https://docs.google.com https://sheets.googleapis.com https://content-sheets.googleapis.com;"
  );
  return next();
});

// Proxy 설정: ALB를 통해 전달된 헤더를 신뢰
app.set('trust proxy', 1);

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// 세션 설정
app.use(session({
  store: store,
  secret: process.env.EXPRESS_SESSION_SECRET || 'your_fallback_secret',
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: 'none',
    maxAge: 60 * 60 * 1000
  }
}));

// JWT 및 세션 인증 미들웨어
const authenticateUser = (req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.status(401).json({ loggedIn: false, error: '유효하지 않은 토큰입니다.' });
      }
      req.user = user;
      next();
    });
  } else if (req.session && req.session.is_logined) {
    next();
  } else {
    res.status(401).json({ loggedIn: false, error: '로그인이 필요합니다.' });
  }
};

// auth 라우터 설정
app.use('/auth', authRouter);

// 세션 생성 확인 로그
app.use((req, res, next) => {
  console.log('세션 정보:', req.session);
  console.log('쿠키 정보:', req.headers.cookie);
  next();
});

// 메인 라우트
app.get('/', (req, res) => {
  if (req.session.is_logined) {
    res.redirect('/public');
  } else {
    res.redirect('/auth/login');
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 메인 페이지
app.get('/main', authenticateUser, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// 사용자 정보 조회
app.get('/get-user', authenticateUser, (req, res) => {
  res.json({ email: req.session.nickname });
});

// Scratch 페이지 리디렉션
app.get('/scratch', authenticateUser, (req, res) => {
  const scratchGuiUrl = `https://3.34.127.154:8601?scratchSession=${req.sessionID}`;
  res.redirect(scratchGuiUrl);
});

// S3에서 파일 가져오기
app.get('/test', async (req, res) => {
  try {
    const params = {
      Bucket: BUCKET_NAME,
      Key: 'https://3.34.127.154/public/test.html'
    };
    const data = await s3.getObject(params).promise();
    res.send(data.Body.toString('utf-8'));
  } catch (error) {
    console.error('Error fetching from S3:', error);
    res.status(500).send('Error fetching page');
  }
});

// 로그인 상태 확인 API
app.get('/api/check-login', (req, res) => {
  if (req.session && req.session.is_logined) {
    res.json({ loggedIn: true });
  } else {
    res.json({ loggedIn: false });
  }
});

// 로그인 처리 API
app.post('/login', (req, res) => {
  const user = { id: 'user-id', username: 'user-name' };
  
  req.session.is_logined = true;
  req.session.nickname = user.username;

  const token = jwt.sign({ username: user.username, sessionID: req.sessionID }, JWT_SECRET, { expiresIn: '1h' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: '.codingnplay.site',
    maxAge: 3600000 // 1시간
  });

  res.json({ success: true, username: user.username });
});

// 유저세션전달 라우트
app.get('/get-user-session', authenticateUser, (req, res) => {
  if (req.user) {
    res.json({ username: req.user.username });
  } else if (req.session && req.session.is_logined) {
    res.json({ username: req.session.nickname });
  } else {
    res.status(401).json({ error: '로그인되지 않은 세션입니다.' });
  }
});

// 로그아웃 처리
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('로그아웃 실패');
    }
    res.clearCookie('token', { domain: '.codingnplay.site', path: '/' });
    res.redirect('/auth/login');
  });
});

// 보호된 경로에 통합된 인증 미들웨어 적용
app.use('/public', authenticateUser);

// 정적 파일 서빙을 위한 경로 설정
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/resource', express.static(path.join(__dirname, 'resource')));

// Python 코드 실행
app.post('/run-python', (req, res) => {
  const { code } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Python code is required.' });
  }

  exec(`python3 -c "${code.replace(/"/g, '\\"')}"`, (error, stdout, stderr) => {
    if (error) {
      return res.json({ error: stderr });
    }
    res.json({ output: stdout });
  });
});

const DEFAULT_PORT = 3000;

function startServer(port) {
  app.listen(port, (err) => {
    if (err) {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying another port...`);
        startServer(port + 1);
      } else {
        console.error(err);
        process.exit(1);
      }
    } else {
      console.log(`Server is running on http://localhost:${port}`);
    }
  });
}

startServer(DEFAULT_PORT);
