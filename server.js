require('dotenv').config();
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');
const db = require('./lib_login/db');
const jwt = require('jsonwebtoken');
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');  // AWS SDK v3
const { fromEnv } = require('@aws-sdk/credential-provider-env');        // 환경 변수에서 자격 증명을 가져오기 위한 모듈
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const authRouter = require('./lib_login/auth');
const { exec } = require('child_process');
const path = require('path');
const mime = require('mime-types');
const fs = require('fs');
const app = express();

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

app.get('/config', (req, res) => {
  res.json({
    apiKey: process.env.GOOGLE_API_KEY,
    discoveryDocs: process.env.DISCOVERY_DOCS,
    spreadsheetId: process.env.SPREADSHEET_ID,
  });
});

// S3 클라이언트 설정 (v3)
const s3Client = new S3Client({
  region: 'ap-northeast-2',
  credentials: fromEnv()  // 환경 변수에서 자격 증명을 로드
});

const BUCKET_NAME = 'educodingnplaycontents';
console.log("AWS_ACCESS_KEY_ID:", process.env.AWS_ACCESS_KEY_ID);
console.log("AWS_SECRET_ACCESS_KEY:", process.env.AWS_SECRET_ACCESS_KEY);

// S3에서 객체 가져오는 함수 (async/await 사용)
const getObjectFromS3 = async (key) => {
  const params = {
    Bucket: BUCKET_NAME,
    Key: key
  };

  try {
    const data = await s3Client.send(new GetObjectCommand(params));
    console.log(data.Body.toString());
    return data.Body;
  } catch (err) {
    console.error("Error fetching from S3:", err);
    throw err;
  }
};

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
    maxAge: 60 * 60 * 1000
  }
}));

// 로그인 인증 미들웨어
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

app.use('/public', (req, res, next) => {
  const filePath = path.join(__dirname, 'public', req.url);
  
  fs.readFile(filePath, (err, content) => {
    if (err) {
      console.error(`File not found: ${filePath}`);
      return next(); // 파일을 찾지 못한 경우 다음 미들웨어로 넘김
    }

    console.log(`Serving file: ${filePath}`);
    
    // MIME 타입 결정
    let contentType = mime.lookup(filePath);
    
    // JavaScript 파일의 경우 항상 'application/javascript'로 설정
    if (path.extname(filePath) === '.js') {
      contentType = 'application/javascript';
    }
    
    // MIME 타입을 결정하지 못한 경우 기본값 사용
    if (!contentType) {
      contentType = 'application/octet-stream';
    }

    res.setHeader('Content-Type', contentType);
    res.send(content);
  });
});

app.use('/resource', express.static(path.join(__dirname, 'public', 'resource')));
app.use('/node_modules/bootstrap-icons', express.static(path.join(__dirname, 'node_modules/bootstrap-icons')));
app.use('/vue-ide', express.static(__dirname + '/vue-ide/public'));

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

// 라우트 설정
app.get('/test', authenticateUser, async (req, res) => {
  // S3에서 파일 가져오기
  try {
    const objectData = await getObjectFromS3('example.txt');  // example.txt 파일을 가져오는 예시
    res.render('test', { 
      user: req.session.username,
      googleApiKey: process.env.GOOGLE_API_KEY,
      spreadsheetId: process.env.SPREADSHEET_ID,
      discoveryDocs: process.env.DISCOVERY_DOCS,
      fileContent: objectData.toString()  // 파일 내용을 렌더링에 사용
    });
  } catch (err) {
    res.status(500).send('Error fetching file from S3');
  }
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
  if (req.session && req.session.is_logined) {
    res.json({ username: req.session.nickname });  // nickname을 username으로 전송
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
