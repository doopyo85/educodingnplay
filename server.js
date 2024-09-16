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

// /config 라우트 - Google API 키와 스프레드시트 ID 등의 정보 제공
app.get('/config', (req, res) => {
  res.json({
    apiKey: process.env.GOOGLE_API_KEY,
    discoveryDocs: process.env.DISCOVERY_DOCS,
    spreadsheetId: process.env.SPREADSHEET_ID
  });
});

const authenticateUser = (req, res, next) => {
  // 로그인 페이지로의 접근은 인증 없이 허용
  if (req.path === '/auth/login') {
    return next();  // 로그인 페이지는 인증 필요 없음
  }

  const token = req.cookies.token;

  if (token) {
    jwt.verify(token, JWT_SECRET, (err, user) => {
      if (err) {
        return res.redirect('/auth/login');  // 토큰이 유효하지 않으면 로그인 페이지로 리다이렉트
      }
      req.user = user;
      next();
    });
  } else if (req.session && req.session.is_logined) {
    next();  // 세션이 존재하면 다음 미들웨어로 이동
  } else {
    res.redirect('/auth/login');  // 로그인되어 있지 않으면 로그인 페이지로 리다이렉트
  }
};


const s3Client = new S3Client({
  region: 'ap-northeast-2',
  credentials: fromEnv(), // 환경변수에서 자격 증명 불러오기
});

const getObjectFromS3 = async (fileName) => {
  const params = {
    Bucket: process.env.BUCKET_NAME,
    Key: fileName
  };

  try {
    const data = await s3Client.send(new GetObjectCommand(params));
    console.log('S3 Object Data:', data); // 데이터 확인용 로그
    return data.Body;
  } catch (err) {
    console.error(`Error fetching file from S3: ${err.message}`);
    throw err;
  }
};

app.get('/auth/login', (req, res) => {
  if (req.session.is_logined) {
    return res.redirect('/');
  } else {
    res.render('login');
  }
});

app.get('/test', authenticateUser, async (req, res) => {
  try {
    const objectData = await getObjectFromS3('default-file.html');
    res.render('test', { 
      user: req.session.username,
      fileContent: objectData.toString()
    });
  } catch (err) {
    console.error(`Error in /test route: ${err.message}`);
    res.status(500).send('Error fetching file from S3');
  }
});

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

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('로그아웃 실패');
    }
    res.clearCookie('token', { domain: '.codingnplay.site', path: '/' });
    res.redirect('/auth/login');
  });
});

app.get('/', authenticateUser, (req, res) => {
  res.render('index', { user: req.session.username });
});

app.get('*', authenticateUser, (req, res) => {
  res.render('index');
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
