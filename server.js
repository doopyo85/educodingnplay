const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const FileStore = require('session-file-store')(session);
const path = require('path');

const authRouter = require('./lib_login/auth'); // auth 라우터 경로
const authCheck = require('./lib_login/authCheck.js');

const app = express();
const DEFAULT_PORT = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,  // 변경: 초기화되지 않은 세션을 저장하지 않음
  store: new FileStore({
    path: path.join(__dirname, 'sessions')  // 세션 파일 경로 설정
  }),
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

// (기존 코드 유지)
app.get('/scratch', isLoggedIn, (req, res) => {
  const scratchGuiUrl = `http://3.34.127.154:8601?scratchSession=${req.sessionID}`;
  console.log('세션 ID 전달:', req.sessionID); // 세션 ID를 콘솔에 출력
  res.redirect(scratchGuiUrl);
});

app.get('/get-user-session', (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) {
    return res.status(400).json({ success: false, error: '세션 ID가 필요합니다.' });
  }

  // 세션 스토어에서 세션 ID로 사용자 정보 가져오기
  const sessionStore = new FileStore();
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
    "script-src-elem 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://code.jquery.com https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
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
