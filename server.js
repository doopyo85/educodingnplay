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

// auth.js 라우트 파일 추가
const authRouter = require('./lib_login/auth');

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

const redisClient = redis.createClient({ url: 'redis://localhost:6379' });
redisClient.connect().catch(console.error);
const store = new RedisStore({ client: redisClient });

app.use(cors({
  origin: 'https://codingnplay.site',
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

// Content Security Policy 설정
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", 
    "default-src 'self'; " +
    "font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' " +
    "https://apis.google.com https://code.jquery.com https://cdn.jsdelivr.net https://unpkg.com " +
    "https://cdnjs.cloudflare.com https://simple-code-editor.vicuxd.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: https://educodingnplaycontents.s3.amazonaws.com https://www.google.com; " +
    "connect-src 'self' https://apis.google.com https://content-sheets.googleapis.com https://educodingnplaycontents.s3.amazonaws.com https://www.google.com https://cdn.jsdelivr.net; " +
    "frame-src 'self' https://docs.google.com https://sheets.googleapis.com https://content-sheets.googleapis.com https://educodingnplaycontents.s3.amazonaws.com;"
  );
  next();
});

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
    maxAge: 60 * 60 * 1000
  }
}));

app.use('/public', express.static(path.join(__dirname, 'public')));
app.use('/resource', express.static(path.join(__dirname, 'public', 'resource')));
app.use('/node_modules/bootstrap-icons', express.static(path.join(__dirname, 'node_modules/bootstrap-icons')));
app.use('/vue-ide', express.static(path.join(__dirname, 'vue-ide/public')));

app.get('/favicon.ico', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'resource', 'favicon.ico'));
});


// 인증 미들웨어를 수정
const authenticateUser = (req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        console.error('Token verification failed:', err);
        req.session.is_logined = false;
        return res.redirect('/auth/login');
      }
      req.user = user;
      req.session.is_logined = true;
      next();
    });
  } else if (req.session && req.session.is_logined) {
    next();
  } else {
    console.log('User not authenticated, redirecting to login');
    res.redirect('/auth/login');
  }
};

// '/get-user-session' 엔드포인트 추가
app.get('/get-user-session', (req, res) => {
  if (req.session && req.session.is_logined) {
    res.json({ username: req.session.username });
  } else {
    res.status(401).json({ error: '로그인되지 않은 세션입니다.' });
  }
});

// '/get-user' 엔드포인트 추가
app.get('/get-user', authenticateUser, (req, res) => {
  res.json({ username: req.session.username });
});

// auth 라우트 연결
app.use('/auth', authRouter);

// /config 라우트 - Google API 키와 스프레드시트 ID 등의 정보 제공
app.get('/config', (req, res) => {
  res.json({
    apiKey: process.env.GOOGLE_API_KEY,
    discoveryDocs: process.env.DISCOVERY_DOCS,
    spreadsheetId: process.env.SPREADSHEET_ID
  });
});

const s3Client = new S3Client({
  region: process.env.AWS_REGION,
  credentials: fromEnv(),
});

const getObjectFromS3 = async (fileName) => {
  const params = {
    Bucket: process.env.AWS_S3_BUCKET_NAME,
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

// '/test' 엔드포인트 수정
app.get('/test', authenticateUser, async (req, res) => {
  try {
    const objectData = await getObjectFromS3('default-file.html');
    res.render('test', { 
      user: req.session.username,
      fileContent: objectData.toString()
    });
  } catch (err) {
    console.error(`Error in /test route: ${err.message}`);
    res.status(500).json({ error: 'Error fetching file from S3' });
  }
});

// Vue.js 라우트에 대한 폴백 처리
app.get('/vue-ide/*', (req, res) => {
  res.sendFile(path.join(__dirname, 'vue-ide/dist/index.html'));
});

// 에러 핸들링 미들웨어 추가
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 로그인 라우트 수정
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  
  // 여기에 실제 사용자 인증 로직을 추가해야 합니다.
  // 예시를 위해 간단한 체크만 수행합니다.
  if (username === 'test' && password === 'password') {
    req.session.is_logined = true;
    req.session.username = username;

    const token = jwt.sign({ username: username, sessionID: req.sessionID }, JWT_SECRET, { expiresIn: '1h' });
    res.cookie('token', token, {
      httpOnly: true,
      secure: true,
      sameSite: 'none',
      domain: '.codingnplay.site',
      maxAge: 3600000
    });

    console.log('Login successful:', username);
    res.json({ success: true, username: username });
  } else {
    console.log('Login failed for:', username);
    res.status(401).json({ success: false, error: '잘못된 사용자명 또는 비밀번호입니다.' });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('로그아웃 실패');
    }
    res.clearCookie('token', { domain: '.codingnplay.site', path: '/' });
    res.redirect('/auth/login');
  });
});

// 라우트 설정
app.get('/', (req, res) => {
  if (req.session && req.session.is_logined) {
    res.render('index', { user: req.session.username });
  } else {
    res.redirect('/auth/login');
  }
});

// 404 처리
app.use((req, res, next) => {
  res.status(404).render('404');
});

app.get('*', authenticateUser, (req, res) => {
  res.status(404).render('404', { user: req.session.username });
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