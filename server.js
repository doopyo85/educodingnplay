const express = require('express');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const cors = require('cors');
const app = express();

const FileStore = require('session-file-store')(session);
const sessionStore = new FileStore();
const authRouter = require('./lib_login/auth');
const authCheck = require('./lib_login/authCheck.js');
const DEFAULT_PORT = 3000;

app.use(cors({
  origin: 'http://3.34.127.154:8601', // 정확한 도메인으로 설정
  credentials: true
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser()); // 쿠키 파서 추가

const isProduction = process.env.NODE_ENV === 'production';

app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: new FileStore({
    path: path.join(__dirname, 'sessions')
  }),
  cookie: {
    maxAge: 1000 * 60 * 60, // 1시간
    sameSite: 'lax', // 개발 단계에서는 lax로 설정
    secure: false // HTTP 환경에서는 false, 나중에 HTTPS로 변경 시 true로 변경
  }
}));

// 로그인 확인 미들웨어 추가
function isLoggedIn(req, res, next) {
  if (req.session.is_logined) {
    return next();
  } else {
    res.redirect('/auth/login');
  }
}

// auth 라우터 설정
app.use('/auth', authRouter);

// 보호된 경로에 로그인 확인 미들웨어 적용
app.use('/public', isLoggedIn);

// 세션 생성 확인 로그
app.use((req, res, next) => {
  console.log('세션 정보:', req.session);
  next();
});

// 루트 경로에 접속했을 때 로그인 화면으로 리디렉트
app.get('/', (req, res) => {
  if (req.session.is_logined) {
    res.redirect('/public');
  } else {
    res.redirect('/auth/login');
  }
});

app.get('/main', isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/get-user', isLoggedIn, (req, res) => {
  res.json({ email: req.session.nickname });
});

app.get('/scratch', isLoggedIn, (req, res) => {
  const scratchGuiUrl = `http://3.34.127.154:8601?scratchSession=${req.sessionID}`;
  console.log('세션 ID 전달:', req.sessionID);
  res.redirect(scratchGuiUrl);
});

app.get('/get-user-session', (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) {
    return res.status(400).json({ success: false, error: '세션 ID가 필요합니다.' });
  }

  sessionStore.get(sessionId, (err, session) => {
    if (err || !session) {
      return res.status(500).json({ success: false, error: '세션 정보를 가져오지 못했습니다.' });
    }

    if (session.is_logined) {
      res.json({ success: true, user: { email: session.nickname } });
    } else {
      res.status(401).json({ success: false, error: '로그인되지 않은 세션입니다.' });
    }
  });
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('로그아웃 실패');
    }
    res.redirect('/auth/login');
  });
});

// 정적 파일 서빙을 위한 경로 설정
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/resource', express.static(path.join(__dirname, 'resource')));

// Content Security Policy 헤더 설정
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", 
    "default-src 'self'; " +
    "font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://code.jquery.com https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' http://fonts.googleapis.com https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "style-src-elem 'self' 'unsafe-inline' http://fonts.googleapis.com https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " + // 추가된 지시문
    "frame-src 'self' https://content-sheets.googleapis.com; " +
    "img-src 'self' data:; " +
    "connect-src 'self' https://apis.google.com https://content-sheets.googleapis.com; " +
    "frame-src 'self' https://docs.google.com https://sheets.googleapis.com https://content-sheets.googleapis.com;"
  );
  return next();
});



function startServer(port) {
  app.listen(port, (err) => {
    if (err) {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying another port...`);
        startServer(port + 1);  // 다른 포트를 시도
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
