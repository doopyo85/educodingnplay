const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');
const db = require('./lib_login/db');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const authRouter = require('./lib_login/auth'); // 인증 관련 라우터
const centerRouter = require('./lib_login/center'); // 센터 관련 라우터
const { exec } = require('child_process');
require('dotenv').config();
const path = require('path');
const mime = require('mime-types');
const fs = require('fs');
const app = express();
const router = express.Router(); // 라우터 정의
const { google } = require('googleapis');

// AWS SDK v3 사용
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { fromEnv } = require('@aws-sdk/credential-provider-env');

// S3Client 설정
const s3Client = new S3Client({
  region: 'ap-northeast-2',
  credentials: fromEnv()
});

// S3에서 객체 가져오는 함수
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

// view 사용 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// JWT 사용 설정
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

app.get('/config', (req, res) => {
  res.json({
    apiKey: process.env.GOOGLE_API_KEY,
    discoveryDocs: [process.env.DISCOVERY_DOCS], // 배열로 감싸기
    spreadsheetId: process.env.SPREADSHEET_ID,
  });
});

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
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://code.jquery.com https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com; " +
    "img-src 'self' data: https://educodingnplaycontents.s3.amazonaws.com https://educodingnplaycontents.s3.ap-northeast-2.amazonaws.com https://www.google.com https://code.org https://blockly.games; " +
    "connect-src 'self' https://apis.google.com https://content-sheets.googleapis.com https://educodingnplaycontents.s3.amazonaws.com https://educodingnplaycontents.s3.ap-northeast-2.amazonaws.com https://www.google.com https://cdn.jsdelivr.net; " +
    "frame-src 'self' https://docs.google.com https://sheets.googleapis.com https://content-sheets.googleapis.com https://educodingnplaycontents.s3.amazonaws.com https://codingnplay.site:8080; " +
    "worker-src 'self' blob:; "  +  // 웹 워커(blob) 허용
    "object-src 'none';"
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

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
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
    secure: true, // HTTPS 환경에서 필수
    httpOnly: true,
    sameSite: 'none', // 크로스 사이트 요청을 허용
    domain: '.codingnplay.site', // 서브도메인 포함 전체 도메인에 쿠키 적용
    maxAge: 60 * 60 * 1000 // 1시간
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

// **인증 라우트 처리**
app.use('/auth', authRouter);

// **센터 관련 라우트 처리**
app.use('/center', centerRouter);

// session 정보를 모든 EJS 템플릿에 전달하는 미들웨어
app.use((req, res, next) => {
  console.log('세션 정보:', req.session);  // 세션 정보를 출력
  console.log('쿠키 정보:', req.headers.cookie);  // 쿠키 정보를 출력
  res.locals.userID = req.session.userID || null;
  res.locals.is_logined = req.session.is_logined || false;
  next();
});

// static 파일 제공 및 기타 라우트 설정
app.use('/public', express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, path, stat) => {
    if (path.endsWith('.js')) {
      res.set('Content-Type', 'application/javascript');
    }
  }
}));

app.use('/resource', express.static(path.join(__dirname, 'public', 'resource')));
app.use('/node_modules/bootstrap-icons', express.static(path.join(__dirname, 'node_modules/bootstrap-icons')));

app.use((req, res, next) => {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  next();
});

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

// queryDatabase 함수 불러오기 (lib_login 폴더에서 가져옴)
const { queryDatabase } = require('./lib_login/db');

// 로그인 라우트 수정
app.post('/login', async (req, res) => {
  const { userID, password } = req.body; // 기존 username을 userID로 변경
  try {
    // queryDatabase를 사용하여 데이터베이스 조회
    const query = 'SELECT * FROM Users WHERE userID = ?';
    const results = await queryDatabase(query, [userID]);

    // 사용자 정보가 있고, 비밀번호가 일치하는지 확인
    if (results.length > 0 && bcrypt.compareSync(password, results[0].password)) {
      req.session.is_logined = true;
      req.session.userID = results[0].userID;
      req.session.userType = results[0].userType;  // 계정 유형 저장
      res.redirect('/');
    } else {
      res.status(401).send('Login Failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Internal Server Error');
  }
});


app.get('/get-user', (req, res) => {
  if (req.session && req.session.userID) {
    res.json({ username: req.session.userID });
  } else {
    res.status(401).json({ error: '인증되지 않은 사용자' });
  }
});

app.get('/api/get-user-type', (req, res) => {
  if (req.session && req.session.userID) {
    res.json({ userType: req.session.userType });
  } else {
    res.status(401).json({ error: '로그인되지 않은 사용자입니다.' });
  }
});


// 세션에서 사용자 정보를 가져오는 라우트
app.get('/get-user-session', (req, res) => {
  console.log('Session data:', req.session);
  console.log('Is logged in:', req.session.is_logined);
  console.log('UserID:', req.session.userID);

  if (req.session && req.session.is_logined) {
    res.json({ userID: req.session.userID });
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

app.get('/public', (req, res) => {
  if (req.session.is_logined) {
      res.render('dashboard'); // 또는 적절한 뷰 렌더링
  } else {
      res.redirect('/auth/login');
  }
});

let sheets;

async function initGoogleSheets() {
  sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY });
}

async function getSheetData(range) {
  if (!sheets) {
    await initGoogleSheets();
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: process.env.SPREADSHEET_ID,
      range: range,
    });
    return response.data.values;
  } catch (error) {
    console.error('Error fetching sheet data:', error);
    throw error;
  }
}

// 서버 시작 시 Google Sheets API 초기화
initGoogleSheets().catch(console.error);

// getSheetData 함수를 다른 모듈에서 사용할 수 있도록 export
module.exports = { getSheetData };

app.get('/api/get-computer-data', async (req, res) => {
  try {
    const data = await getSheetData('computer!A2:E'); // 'computer' 시트에서 A2:E 범위의 데이터를 가져옴
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '컴퓨터 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

app.get('/api/get-sb3-data', async (req, res) => {
  try {
    const data = await getSheetData('sb3!A2:C');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: 'sb3 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

app.get('/api/get-ent-data', async (req, res) => {
  try {
    const data = await getSheetData('ent!A2:E');
    res.json(data);
  } catch (error) {
    console.error('Error fetching ENT data:', error);
    res.status(500).json({ error: 'ENT 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

app.get('/api/get-menu-data', async (req, res) => {
  try {
    const data = await getSheetData('menulist!A2:C');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '메뉴 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

app.get('/api/get-problem-data', async (req, res) => {
  try {
    const data = await getSheetData('문항정보!A:C');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '문제 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// /computer 라우트 추가
app.get('/computer', authenticateUser, (req, res) => {
  // 세션 정보 로깅 (필요시)
  console.log('User session:', req.session); 

  // 'computer.ejs' 템플릿 렌더링
  res.render('computer', {
    userID: req.session.userID || null,
    is_logined: req.session.is_logined || false
  });
});

// 구글 시트에서 books 데이터를 가져오는 API
app.get('/api/get-books-data', async (req, res) => {
  try {
    const data = await getSheetData('books!A2:C');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '책 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// /books 페이지를 렌더링하는 라우트
app.get('/books', authenticateUser, (req, res) => {
  console.log('User session:', req.session);  // 세션 정보 로깅
  res.render('books', {
    userID: req.session.userID || null,
    is_logined: req.session.is_logined || false
  });
});

// /reader 페이지 라우트 추가 (pdfUrl을 쿼리 파라미터로 받아서 처리)
app.get('/reader', authenticateUser, (req, res) => {
  const pdfUrl = req.query.pdfUrl;  // 쿼리 파라미터에서 PDF URL을 받아옴
  if (pdfUrl) {
      res.render('reader', { pdfUrl: pdfUrl });
  } else {
      res.status(400).send('PDF URL이 제공되지 않았습니다.');
  }
});


// Scratch 프로젝트 목록 페이지
app.get('/scratch_project', authenticateUser, (req, res) => {
  console.log('User session:', req.session); // 세션 정보 로깅
  res.render('scratch_project', {
    userID: req.session.userID || null,
    is_logined: req.session.is_logined || false
  });
});

// Scratch GUI로 리다이렉트
app.get('/scratch', (req, res) => {
  res.redirect('http://localhost:8601');
});

// entry 프로젝트 목록페이지
app.get('/entry_project', authenticateUser, (req, res) => {
  console.log('User session:', req.session);
  res.render('entry_project', {
    userID: req.session.userID || null,
    is_logined: req.session.is_logined || false
  });
});

// entry 렌더링 (수정된 버전)
app.get('/entry', (req, res) => {
  res.redirect('https://codingnplay.site:8080');  // HTTPS로 변경하고 도메인 사용
});

// test 렌더링
app.get('/test', authenticateUser, (req, res) => {
  res.render('test');  // 'test.ejs' 템플릿을 렌더링
});

// 파이썬 코드를 실행하는 라우트
app.post('/run-python', (req, res) => {
  const userCode = req.body.code; // 클라이언트로부터 받은 코드

  // 임시 파이썬 파일로 저장한 후 실행
  const fs = require('fs');
  const path = './temp.py';
  
  fs.writeFileSync(path, userCode); // 파일에 코드 작성

  // 파이썬 파일 실행
  exec(`python3 ${path}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.json({ output: `Error: ${error.message}` });
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return res.json({ output: `stderr: ${stderr}` });
    }

    res.json({ output: stdout }); // 결과 전송
  });
});

// 누적 회원 수 및 현재 접속자 수를 반환하는 API
app.get('/api/stats', async (req, res) => {
  try {
    // queryDatabase를 사용하여 전체 사용자 수 조회
    const totalUsersQuery = 'SELECT COUNT(*) as count FROM Users';
    const totalUsers = await queryDatabase(totalUsersQuery);

    // Redis를 사용하여 현재 접속자 수 조회
    const activeUsers = await redisClient.sCard('active_users');

    // 결과를 JSON으로 반환
    res.json({
      totalUsers: totalUsers[0].count,  // 회원 수
      activeUsers: activeUsers  // 현재 접속자 수
    });
  } catch (error) {
    console.error('Error fetching stats:', error);
    res.status(500).json({ error: '통계를 불러오는 중 오류가 발생했습니다.' });
  }
});

const boardRouter = require('./routes/board');
app.use('/board', boardRouter);

// 루트 경로 라우트
app.get('/', (req, res) => {
  if (!req.session.is_logined) {
    res.redirect('/auth/login');
  } else {
    res.render('index');
  }
});

// 모든 라우트에서 사용할 기본 라우트 (페이지가 없을 때)
app.get('*', authenticateUser, (req, res) => {
  res.render('index');
});

app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Something went wrong!' });
});

// 서버 시작 함수
const DEFAULT_PORT = 3000;
let currentPort = DEFAULT_PORT;

function startServer(port) {
    const server = app.listen(port)
        .on('error', (err) => {
            if (err.code === 'EADDRINUSE') {
                console.log(`Port ${port} is in use, trying ${port + 1}...`);
                currentPort++;
                startServer(currentPort);
            } else {
                console.error('Error starting server:', err);
            }
        })
        .on('listening', () => {
            console.log(`Server is running on http://localhost:${port}`);
        });
}

startServer(currentPort);

