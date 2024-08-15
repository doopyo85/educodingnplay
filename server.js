const express = require('express');
const AWS = require('aws-sdk');
const path = require('path');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');
const cors = require('cors');
const authRouter = require('./lib_login/auth'); // authRouter를 가져오는 코드 추가
const app = express();
const { exec } = require('child_process');

// AWS S3 설정
const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'ap-northeast-2' // 예: 'us-west-2'
});

const BUCKET_NAME = 'educodingnplaycontents';

// Redis 설정
const redisClient = redis.createClient({
  url: 'redis://localhost:6379'
});

redisClient.connect().catch(console.error);

const store = new RedisStore({
  client: redisClient,
  prefix: 'sess:'
});

app.use(cors({
  origin: 'https://codingnplay.site',
  credentials: true
}));

app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

app.use(session({
  store: store,
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  cookie: {
    path: '/',
    _expires: new Date(Date.now() + 60 * 60 * 1000), // 1시간 후 만료
    originalMaxAge: 60 * 60 * 1000, // 1시간 후 만료
    httpOnly: true,
    sameSite: 'none', // HTTPS에서는 'none'으로 설정
    secure: true // HTTPS 환경에서는 true로 설정
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
  const scratchGuiUrl = `http://3.34.127.154:8601?scratchSession=${req.sessionID}`;
  console.log('세션 ID 전달:', req.sessionID);
  res.redirect(scratchGuiUrl);
});

app.get('/test', async (req, res) => {
  try {
      const params = {
          Bucket: BUCKET_NAME,
          Key: 'http://3.34.127.154/public/test.html'
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

app.get('/get-user-session', (req, res) => {
  const sessionId = req.query.sessionId;
  if (!sessionId) {
    return res.status(400).json({ success: false, error: '세션 ID가 필요합니다.' });
  }

  store.get(sessionId, (err, session) => {
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
    "style-src-elem 'self' 'unsafe-inline' http://fonts.googleapis.com https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "frame-src 'self' https://content-sheets.googleapis.com; " +
    "img-src 'self' data:; " +
    "connect-src 'self' https://apis.google.com https://content-sheets.googleapis.com; " +
    "frame-src 'self' https://docs.google.com https://sheets.googleapis.com https://content-sheets.googleapis.com;"
  );
  return next();
});

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
