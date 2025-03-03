const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');
const db = require('./lib_login/db');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const { exec } = require('child_process');
require('dotenv').config();
const path = require('path');
const mime = require('mime-types');
const fs = require('fs');
const { google } = require('googleapis');
const { BASE_URL, API_ENDPOINTS, Roles } = require('./config');
const cron = require('node-cron'); // 결제정보 자정마다 업데이트
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');

const app = express();

// server.js - 서버 시작 시 권한 캐시 초기화
const { updatePermissionCache } = require('./lib_login/permissions');
const permissionsPath = path.join(__dirname, './lib_login/permissions.json');
const permissions = JSON.parse(fs.readFileSync(permissionsPath, 'utf8'));
updatePermissionCache(permissions);

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

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, 'public'), {
  setHeaders: (res, filePath, stat) => {
    // JavaScript 파일에 대한 특별한 처리
    if (path.extname(filePath) === '.js') {
      res.set('Content-Type', 'application/javascript');
    } else {
      // 다른 파일들에 대한 처리
      res.set('Content-Type', mime.lookup(filePath) || 'application/octet-stream');
    }
    
    // 캐싱 정책 설정
    res.set('Cache-Control', 'public, max-age=3600');
  }
}));

// JWT 사용 설정
const JWT_SECRET = process.env.JWT_SECRET || 'your_jwt_secret';

app.get('/config', (req, res) => {
  res.json({
    apiKey: process.env.GOOGLE_API_KEY,
    discoveryDocs: [process.env.DISCOVERY_DOCS], // 배열로 감싸기
    spreadsheetId: process.env.SPREADSHEET_ID,
  });
});

// Redis 클라이언트 설정
const redisClient = redis.createClient({ url: 'redis://localhost:6379' });
redisClient.connect().catch(console.error);

// Redis 이벤트 리스너 제한 증가
redisClient.setMaxListeners(20);

const store = new RedisStore({ 
    client: redisClient,
    prefix: 'educodingnplay:sess:'  // 세션 키 접두사 추가
});
store.setMaxListeners(20);

// CORS 설정 - 중복 설정 제거하고 한 번만 적용
const allowedOrigins = [
  'https://codingnplay.co.kr',
  'https://www.codingnplay.co.kr',
  'https://app.codingnplay.co.kr',
  'http://codingnplay.co.kr',
  'http://www.codingnplay.co.kr',
  undefined  // 같은 origin 요청 허용
];

app.use(cors({
  origin: (origin, callback) => {
    console.log('Request Origin:', origin);
    
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error(`Not allowed by CORS: ${origin}`));
    }
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type',
    'Authorization',
    'X-Requested-With',
    'Accept',
    'Origin',
    'Access-Control-Allow-Headers',
    'Access-Control-Request-Method',
    'Access-Control-Request-Headers'
  ],
  exposedHeaders: ['Content-Range', 'X-Content-Range']
}));

// Content Security Policy 설정
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", 
    "default-src 'self'; " +
    "font-src 'self' data: https://cdnjs.cloudflare.com https://fonts.googleapis.com https://fonts.gstatic.com https://cdn.jsdelivr.net; " +
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://apis.google.com https://code.jquery.com https://cdn.jsdelivr.net https://unpkg.com https://cdnjs.cloudflare.com https://playentry.org; " +
    "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://playentry.org; " +
    "img-src 'self' data: https://educodingnplaycontents.s3.amazonaws.com https://educodingnplaycontents.s3.ap-northeast-2.amazonaws.com https://www.google.com https://code.org https://blockly.games https://playentry.org; " +
    "connect-src 'self' https://apis.google.com https://content-sheets.googleapis.com https://educodingnplaycontents.s3.amazonaws.com https://educodingnplaycontents.s3.ap-northeast-2.amazonaws.com https://www.google.com https://cdn.jsdelivr.net https://cdnjs.cloudflare.com https://playentry.org; " +
    "frame-src 'self' https://docs.google.com https://sheets.googleapis.com https://content-sheets.googleapis.com https://educodingnplaycontents.s3.amazonaws.com https://app.codingnplay.co.kr:8080 https://playentry.org; " +
    "worker-src 'self' blob:; " +
    "object-src 'none';"
  );
  next();
});

app.set('trust proxy', 1);

// 권한 관련 미들웨어
const { 
  checkPageAccess, 
  checkRole,
  checkAdminRole 
} = require('./lib_login/authMiddleware');

// 로깅 미들웨어
const { 
  logUserActivity, 
  logMenuAccess, 
  logLearningActivity 
} = require('./lib_login/logging');

// 기본 미들웨어 등록
app.use(logUserActivity);
app.use(logMenuAccess);
app.use(logLearningActivity);
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// 세션 설정
app.use(session({
  store: store,
  secret: process.env.EXPRESS_SESSION_SECRET || 'your_fallback_secret',
  resave: false,
  saveUninitialized: false,
  cookie: {
      secure: process.env.NODE_ENV === 'production',
      httpOnly: true,
      sameSite: 'none',
      domain: '.codingnplay.co.kr',
      maxAge: 60 * 60 * 1000 // 1시간
  }
}));

// 요청 정보 로깅
app.use((req, res, next) => {
  console.log(`요청 프로토콜: ${req.protocol}`);
  console.log(`요청 도메인: ${req.hostname}`);
  console.log(`세션 상태:`, req.session);
  next();
});

// 인증 미들웨어
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

// 템플릿 변수 설정 미들웨어
app.use((req, res, next) => {
  res.locals.userID = req.session?.userID || null;
  res.locals.is_logined = req.session?.is_logined || false;
  res.locals.role = req.session?.role || 'guest';
  next();
});

// HSTS 설정
app.use((req, res, next) => {
  res.setHeader(
    'Strict-Transport-Security',
    'max-age=31536000; includeSubDomains; preload'
  );
  next();
});

// 파일 타입 설정
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

// 사용자 활동 로깅
app.use(async (req, res, next) => {
  if (req.session?.is_logined) {
    try {
      const [user] = await db.queryDatabase(
        'SELECT id, centerID FROM Users WHERE userID = ?',
        [req.session.userID]
      );
      
      if (user) {
        await db.queryDatabase(
          `INSERT INTO UserActivityLogs 
          (user_id, center_id, action_type, url, ip_address, user_agent) 
          VALUES (?, ?, ?, ?, ?, ?)`,
          [
            user.id,
            user.centerID,
            req.method,
            req.originalUrl,
            req.ip,
            req.headers['user-agent']
          ]
        );
      }
    } catch (error) {
      console.error('Logging error:', error);
    }
  }
  next();
});

// Google Sheets API 초기화 및 데이터 가져오기 함수
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

// API 모듈 내보내기
module.exports = { getSheetData };

// =====================================================================
// 라우터 통합 정의 및 등록
// =====================================================================

// 모든 라우터를 한 곳에서 정의하고 등록
const routes = {
  'auth': require('./lib_login/auth'),
  'admin': require('./routes/admin'),
  'board': require('./routes/boardRouter'),
  'kinder': require('./routes/kinder'),
  'learning': require('./routes/learning'),
  'machinelearning': require('./routes/machinelearningRouter'),
  'metaverse': require('./routes/metaverseRouter'),
  'onlineclass': require('./routes/onlineclassRouter'),
  'entry': require('./routes/entryRouter')
};

// 라우터 등록
Object.entries(routes).forEach(([path, router]) => {
  app.use(`/${path}`, router);
});

// =====================================================================
// API 라우트 정의
// =====================================================================

// 사용자 관련 API
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

app.get('/get-user-session', (req, res) => {
  if (req.session && req.session.is_logined) {
    res.json({
      userID: req.session.userID,
      role: req.session.role, 
      is_logined: true,
      centerID: req.session.centerID
    });
  } else {
    res.status(401).json({ 
      is_logined: false,
      role: 'guest'
    });
  }
});

app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('로그아웃 실패');
    }
    res.clearCookie('token', { domain: '.codingnplay.co.kr', path: '/' });
    res.redirect('/auth/login');
  });
});

// 로그인 라우트
app.post('/login', async (req, res) => {
  const { userID, password } = req.body;
  try {
    const query = 'SELECT * FROM Users WHERE userID = ?';
    const results = await db.queryDatabase(query, [userID]);

    if (results.length > 0 && bcrypt.compareSync(password, results[0].password)) {
      // 세션에 로그인 정보 저장
      req.session.is_logined = true;
      req.session.userID = results[0].userID;
      req.session.userType = results[0].userType;
      req.session.role = results[0].role;
      req.session.centerID = results[0].centerID;

      req.session.save((err) => {
        if (err) {
          console.error('Session save error:', err);
          return res.status(500).json({ error: '세션 저장 중 오류가 발생했습니다.' });
        }
        res.json({ success: true, redirect: '/' });
      });
    } else {
      res.status(401).send('Login Failed');
    }
  } catch (error) {
    console.error('Login error:', error);
    res.status(500).send('Internal Server Error');
  }
});

// 구글 시트 데이터 API
app.get('/api/get-computer-data', async (req, res) => {
  try {
    const data = await getSheetData('computer!A2:E'); 
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

app.get('/api/get-onlineclass-data', async (req, res) => {
  try {
    const data = await getSheetData('onlineClass!A2:C'); 
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

app.get('/api/get-sb2-data', 
  checkRole(['admin', 'teacher', 'manager']),
  async (req, res) => {
    try {
      const data = await getSheetData('sb2!A2:F');
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' });
    }
  }
);

app.get('/api/get-sb3-data', 
  checkRole(['admin', 'teacher', 'manager', 'student']),
  async (req, res) => {
    try {
      const data = await getSheetData('sb3!A2:F');
      res.json(data);
    } catch (error) {
      res.status(500).json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' });
    }
  }
);

app.get('/api/get-ent-data', 
  checkRole(['admin', 'teacher', 'manager', 'student']), 
  async (req, res) => {
    try {
      const data = await getSheetData('ent!A2:F');  
      res.json(data);
    } catch (error) {
      console.error('구글 시트 데이터 불러오기 오류:', error);
      res.status(500).json({ error: '엔트리 프로젝트 데이터를 불러오는 중 오류 발생' });
    }
  }
);

app.get('/api/get-menu-data', async (req, res) => {
  try {
    const data = await getSheetData('menulist!A2:C');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '메뉴 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

app.get('/api/get-teachermenu-data', async (req, res) => {
  try {
    const data = await getSheetData('teacher!A2:h');
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

// Tasks 가져오기(너구리톡)
app.get('/api/get-task-data', async (req, res) => {
  try {
    const data = await getSheetData('Tasks!A2:C');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '업무 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// =====================================================================
// 페이지 라우트 정의
// =====================================================================

// /computer 라우트
app.get('/computer', 
  checkPageAccess('/computer'),
  (req, res) => {
    res.render('computer', {
      userID: req.session.userID,
      userRole: req.session.role,
      is_logined: req.session.is_logined,
      centerID: req.session.centerID
    });
  }
);

// Scratch 프로젝트 목록 페이지
app.get('/scratch_project', 
  checkPageAccess('/scratch_project'),
  (req, res) => {
    res.render('scratch_project', {
      userID: req.session.userID,
      userRole: req.session.role,
      is_logined: req.session.is_logined,
      centerID: req.session.centerID
    });
  }
);

// Scratch GUI로 리다이렉트
app.get('/scratch', (req, res) => {
  res.redirect(`${BASE_URL}:8601`);
});

// Entry 프로젝트 목록 페이지
app.get('/entry_project', 
  checkPageAccess('/entry_project'),
  (req, res) => {
    res.render('entry_project', {
      userID: req.session.userID,
      userRole: req.session.role,
      is_logined: req.session.is_logined,
      centerID: req.session.centerID
    });
  }
);

// Python 페이지
app.get('/python', 
  checkPageAccess('/python'),
  (req, res) => {
    res.render('python_project', {
      userID: req.session.userID,
      userRole: req.session.role,
      is_logined: req.session.is_logined,
      centerID: req.session.centerID
    });
  }
);

// 파이썬 코드를 실행하는 라우트
app.post('/run-python', (req, res) => {
  const userCode = req.body.code;
  const path = './temp.py';
  
  fs.writeFileSync(path, userCode);

  exec(`python3 ${path}`, (error, stdout, stderr) => {
    if (error) {
      console.error(`Error: ${error.message}`);
      return res.json({ output: `Error: ${error.message}` });
    }
    if (stderr) {
      console.error(`stderr: ${stderr}`);
      return res.json({ output: `stderr: ${stderr}` });
    }

    res.json({ output: stdout });
  });
});

// 교사교육 사이트
app.get('/teacher', (req, res) => {
  res.render('teacher');
});

// 루트 경로
app.get('/', (req, res) => {
  if (!req.session.is_logined) {
    res.redirect('/auth/login');
  } else {
    res.render('index');
  }
});

// 매일 자정 구독 상태 업데이트
cron.schedule('0 0 * * *', async () => {
  try {
    const query = `
      UPDATE Users
      SET subscription_status = 'expired'
      WHERE subscription_expiry < CURDATE() AND subscription_status = 'active'
    `;
    await db.queryDatabase(query);
    console.log('구독 만료 상태 업데이트 완료');
  } catch (error) {
    console.error('구독 만료 상태 업데이트 중 오류:', error);
  }
});

// 정적 자원 제공
app.use('/resource', express.static(path.join(__dirname, 'public', 'resource')));
app.use('/node_modules/bootstrap-icons', express.static(path.join(__dirname, 'node_modules/bootstrap-icons')));
app.use('/js/turn.js', express.static(path.join(__dirname, 'node_modules/turn.js/turn.min.js')));

// 기본 라우트 (페이지가 없을 때)
app.get('*', authenticateUser, (req, res) => {
  res.render('index');
});

// 오류 처리 미들웨어
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