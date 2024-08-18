const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');
const db = require('./lib_login/db'); // MySQL 연결 설정 파일
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const authRouter = require('./lib_login/auth'); // authRouter를 가져오는 코드 추가
// const authRoutes = require('./lib_login/template.js'); // 중복되는 라우터 제거
const { exec } = require('child_process');

const app = express();

// auth 라우터 설정
app.use('/auth', authRouter);

// Redis 클라이언트 설정
const redisClient = redis.createClient();
redisClient.connect()
  .then(() => console.log('Redis 연결 성공'))
  .catch((err) => console.error('Redis 연결 실패:', err));

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
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "img-src 'self' data:; " +
    "connect-src 'self' https://apis.google.com https://content-sheets.googleapis.com; " +
    "frame-src 'self' https://docs.google.com https://sheets.googleapis.com https://content-sheets.googleapis.com;"
  );
  next();
});


// AWS S3 설정
const AWS = require('aws-sdk');
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'ap-northeast-2' // 예: 'us-west-2'
});
const BUCKET_NAME = 'educodingnplaycontents';

// Proxy 설정: ALB를 통해 전달된 헤더를 신뢰
app.set('trust proxy', 1); 

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// 세션 설정
const store = new RedisStore({ client: redisClient }); // 세션 스토어 설정
app.use(session({
  store: store,
  secret: 'your-secret-key',
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

// 로그인 확인 미들웨어 추가
function isLoggedIn(req, res, next) {
  console.log('로그인 상태 확인:', req.session);  // 세션 정보 로그
  if (req.session.is_logined) {
    return next();
  } else {
    res.redirect('/auth/login');
  }
}

// 기타 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 보호된 경로에 로그인 확인 미들웨어 적용
app.use('/public', isLoggedIn);

// 세션 생성 확인 로그
app.use((req, res, next) => {
  console.log('세션 정보:', req.session);
  console.log('쿠키 정보:', req.headers.cookie); // 클라이언트 쿠키 정보 로그
  next();
});

app.get('/', (req, res) => {
  if (req.originalUrl === '/' && req.session.is_logined) {
    res.redirect('/public');
  } else if (req.originalUrl === '/') {
    res.redirect('/auth/login');
  } else {
    // /scratch 경로는 리디렉션하지 않음
    if (req.originalUrl.startsWith('/scratch')) {
      res.sendFile(path.join(__dirname, 'public', 'scratch.html'));
    } else {
      res.redirect('/');
    }
  }
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/main', isLoggedIn, (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.get('/get-user', isLoggedIn, (req, res) => {
  res.json({ email: req.session.nickname });
});

app.get('/scratch', isLoggedIn, (req, res) => {
  const scratchGuiUrl = `https://3.34.127.154:8601?scratchSession=${req.sessionID}`;
  console.log('세션 ID 전달:', req.sessionID);
  res.redirect(scratchGuiUrl);
});

app.get('/test', async (req, res) => {
  try {
      const params = {
          Bucket: BUCKET_NAME,
          Key: 'https://3.34.127.154/public/test.html'
      };

      const data = await s3.getObject(params).promise();
      const htmlContent = data.Body.toString('utf-8');
      
      // 필요한 경우, 데이터에 변화를 줄 수 있음
      res.send(htmlContent);
  } catch (error) {
      console.error('Error fetching from S3:', error);
      res.status(500).send('Error fetching page');
  }
});

// 로그인 상태 확인 API
app.get('/api/check-login', (req, res) => {
  if (req.session && req.session.user) {
      res.json({ loggedIn: true });
  } else {
      res.json({ loggedIn: false });
  }
});

// 로그인 처리 API
app.post('/login', (req, res) => {
  req.session.user = { id: 'user-id', name: 'user-name' };
  res.json({ success: true });
});

// 세션 정보 가져오기 API
app.get('/get-user-session', (req, res) => {
  console.log('Session ID:', req.sessionID);
  console.log('Cookies:', req.cookies);

  store.get(req.sessionID, (err, session) => {
    if (err) {
      console.error('Redis에서 세션을 가져오는 중 오류 발생:', err);
      return res.status(500).json({ success: false, error: '세션 정보를 가져오지 못했습니다.' });
    }

    if (!session) {
      console.warn('세션을 찾을 수 없습니다. 세션 ID:', req.sessionID);
      return res.status(404).json({ success: false, error: '세션을 찾을 수 없습니다.' });
    }

    if (session.is_logined) {
      console.log('세션이 유효합니다. 닉네임:', session.nickname);
      res.json({ success: true, user: { email: session.nickname } });
    } else {
      console.warn('로그인되지 않은 세션입니다. 세션 ID:', req.sessionID);
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

// 정적 파일 제공
app.use('/node_modules', express.static(path.join(__dirname, 'node_modules')));
app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/resource', express.static(path.join(__dirname, 'resource')));

app.post('/run-python', (req, res) => {
  const { code } = req.body;

  if (!code) {
      console.error('Python code is undefined or empty.');
      return res.status(400).json({ error: 'Python code is required.' });
  }

  exec(`python3 -c "${code.replace(/"/g, '\\"')}"`, (error, stdout, stderr) => {
      if (error) {
          console.error('Error executing Python code:', error);
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
