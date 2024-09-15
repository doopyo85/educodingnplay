require('dotenv').config();
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { fromEnv } = require('@aws-sdk/credential-provider-env');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const app = express();

// EJS 템플릿 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// JWT 시크릿 키 설정
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

// Redis 클라이언트 및 세션 설정
const redisClient = redis.createClient({ url: 'redis://localhost:6379' });
redisClient.connect().catch(console.error);
const store = new RedisStore({ client: redisClient });

app.use(cors({
  origin: 'https://codingnplay.site',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

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
    domain: '.codingnplay.site',
    maxAge: 60 * 60 * 1000 // 1시간 유지
  }
}));

// 세션 및 쿠키 상태 점검
app.use((req, res, next) => {
  console.log('세션 정보:', req.session);
  console.log('쿠키 정보:', req.headers.cookie);
  next();
});

// 정적 파일 제공 설정
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/resource', express.static(path.join(__dirname, 'public', 'resource')));
app.use('/node_modules/bootstrap-icons', express.static(path.join(__dirname, 'node_modules/bootstrap-icons')));
app.use('/vue-ide', express.static(path.join(__dirname, 'vue-ide/public')));

// /favicon.ico 요청을 처리하여 업로드된 파일을 제공
app.get('/favicon_cna.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'resource', 'favicon_cna.ico'));
});

// JWT를 이용한 사용자 인증 미들웨어
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

// 환경 변수 설정 정보 출력
app.get('/config', (req, res) => {
  res.json({
    apiKey: process.env.GOOGLE_API_KEY,
    discoveryDocs: process.env.DISCOVERY_DOCS,
    spreadsheetId: process.env.SPREADSHEET_ID,
  });
});


// S3에서 파일 가져오기 함수
const getObjectFromS3 = async (fileName) => {
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: fileName
  };
  try {
    const data = await s3Client.send(new GetObjectCommand(params));
    return data.Body;
  } catch (err) {
    console.error(`Error fetching file from S3: ${err.message}`);
    throw err;
  }
};


// /test 라우트 - S3에서 파일 가져오기
app.get('/test', authenticateUser, async (req, res) => {
  try {
    // S3에서 파일 가져오기 (기본 파일명 사용)
    const objectData = await getObjectFromS3('default-file.html');

    // test.ejs로 데이터 전달
    res.render('test', { 
      user: req.session.username,
      fileContent: objectData.toString()
    });
  } catch (err) {
    console.error(`Error in /test route: ${err.message}`);
    res.status(500).send('Error fetching file from S3');
  }
});

// 로그인 처리
app.post('/login', (req, res) => {
  const user = { id: 'user-id', username: 'user-name' };
  
  req.session.is_logined = true;
  req.session.username = user.username;

  const token = jwt.sign({ username: user.username, sessionID: req.sessionID }, JWT_SECRET, { expiresIn: '1h' });
  res.cookie('token', token, {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    domain: '.codingnplay.site',
    maxAge: 3600000
  });

  res.json({ success: true, username: user.username });
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

// 메인 페이지 라우트
app.get('/', authenticateUser, (req, res) => {
  res.render('index', { user: req.session.username });
});

// 기타 라우트
app.get('/scratch', authenticateUser, (req, res) => {
  res.render('scratch');
});
app.get('/computer_basic', authenticateUser, (req, res) => {
  res.render('computer_basic');
});
app.get('/entry', authenticateUser, (req, res) => {
  res.render('entry');
});

// 로그인 상태 체크 API
app.get('/api/check-login', (req, res) => {
  if (req.session && req.session.is_logined) {
    res.json({ loggedIn: true });
  } else {
    res.json({ loggedIn: false });
  }
});

// 사용자 세션 정보 확인 API
app.get('/get-user-session', authenticateUser, (req, res) => {
  if (req.session && req.session.is_logined) {
    res.json({ username: req.session.username });
  } else {
    res.status(401).json({ error: '로그인되지 않은 세션입니다.' });
  }
});

// 헬스 체크 API
app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

// 모든 경로에 대한 기본 라우트 처리
app.get('*', authenticateUser, (req, res) => {
  res.render('index');
});

// 서버 시작
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
