const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');
const db = require('./lib_login/db');
const jwt = require('jsonwebtoken');
const AWS = require('aws-sdk');
const path = require('path');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const authRouter = require('./lib_login/auth');
const { exec } = require('child_process');
require('dotenv').config();
const mime = require('mime-types');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

app.get('/config', (req, res) => {
  res.json({
      apiKey: process.env.GOOGLE_API_KEY,
      discoveryDocs: [process.env.DISCOVERY_DOCS],
      spreadsheetId: process.env.SPREADSHEET_ID,
  });
});

const s3 = new AWS.S3({
  accessKeyId: process.env.AWS_ACCESS_KEY_ID,
  secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  region: 'ap-northeast-2'
});

const BUCKET_NAME = 'educodingnplaycontents';

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
    "font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://code.jquery.com https://cdn.jsdelivr.net; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: https://educodingnplaycontents.s3.amazonaws.com; " +
    "connect-src 'self' https://apis.google.com https://content-sheets.googleapis.com https://educodingnplaycontents.s3.amazonaws.com; " +
    "frame-src 'self' https://docs.google.com https://sheets.googleapis.com https://content-sheets.googleapis.com https://educodingnplaycontents.s3.amazonaws.com;"
  );
  next();
});

app.set('trust proxy', 1);

app.use((req, res, next) => {
  if (req.secure) {
    next();
  } else {
    res.redirect('https://' + req.headers.host + req.url);
  }
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

app.use('/auth', authRouter);

app.use((req, res, next) => {
  console.log('세션 정보:', req.session);
  console.log('쿠키 정보:', req.headers.cookie);
  next();
});

app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath) => {
    res.setHeader('Content-Type', mime.lookup(filePath) || 'application/octet-stream');
  }
}));
app.use('/resource', express.static(path.join(__dirname, 'public', 'resource')));

app.use((req, res, next) => {
  const ext = path.extname(req.url).toLowerCase();
  switch (ext) {
    case '.js':
      res.type('application/javascript');
      break;
    case '.css':
      res.type('text/css');
      break;
    case '.json':
      res.type('application/json');
      break;
    case '.png':
      res.type('image/png');
      break;
    case '.jpg':
    case '.jpeg':
      res.type('image/jpeg');
      break;
    case '.wav':
      res.type('audio/wav');
      break;
  }
  next();
});

app.get('/', (req, res) => {
  if (req.session.is_logined) {
    res.render('index', { user: req.session.username });
  } else {
    res.redirect('/auth/login');
  }
});

app.get('/scratch', authenticateUser, (req, res) => {
  res.render('scratch');
});

app.get('/computer_basic', authenticateUser, (req, res) => {
  res.render('computer_basic');
});

app.get('/entry', authenticateUser, (req, res) => {
  res.render('entry');
});

app.get('/test', authenticateUser, (req, res) => {
  res.render('test');
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/get-user', authenticateUser, (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  res.json({ username: req.session.username });
});

app.get('/scratch-gui', authenticateUser, (req, res) => {
  const token = req.cookies.token;
  const scratchGuiUrl = `https://3.34.127.154:8601?token=${token}`;
  res.redirect(scratchGuiUrl);
});

app.get('/api/check-login', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.session && req.session.is_logined) {
    res.json({ loggedIn: true });
  } else {
    res.json({ loggedIn: false });
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

  res.setHeader('Content-Type', 'application/json');
  res.json({ success: true, username: user.username });
});

app.get('/get-user-session', (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  if (req.session && req.session.is_logined) {
      res.json({ username: req.session.username });
  } else {
      res.status(401).json({ error: '로그인되지 않은 세션입니다.' });
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

// 이 라우트를 마지막에 배치
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