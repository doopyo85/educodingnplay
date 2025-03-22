require('dotenv').config();
const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');
const jwt = require('jsonwebtoken');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const mime = require('mime-types');
const fs = require('fs');
const { google } = require('googleapis');
const cron = require('node-cron');
const { ListObjectsV2Command } = require('@aws-sdk/client-s3');
const bcrypt = require('bcrypt');

// 설정 파일 불러오기
const config = require('./config');

// DB 및 권한 관련 모듈 불러오기
const db = require('./lib_login/db');
const { updatePermissionCache } = require('./lib_login/permissions');
const { checkPageAccess, checkRole, checkAdminRole } = require('./lib_login/authMiddleware');
const { logUserActivity, logMenuAccess, logLearningActivity } = require('./lib_login/logging');

const app = express();

// 서버 시작 시 권한 캐시 초기화
const permissionsPath = path.join(__dirname, './lib_login/permissions.json');
const permissions = JSON.parse(fs.readFileSync(permissionsPath, 'utf8'));
updatePermissionCache(permissions);

// AWS SDK v3 사용
const { S3Client, GetObjectCommand } = require('@aws-sdk/client-s3');
const { fromEnv } = require('@aws-sdk/credential-provider-env');

// S3Client 설정
const s3Client = new S3Client({
  region: config.S3.REGION,
  credentials: fromEnv()
});

// S3에서 객체 가져오는 함수
const getObjectFromS3 = async (fileName) => {
  const params = {
    Bucket: config.S3.BUCKET_NAME,
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
    if (path.extname(filePath) === '.js') {
      res.set('Content-Type', 'application/javascript');
    } else {
      res.set('Content-Type', mime.lookup(filePath) || 'application/octet-stream');
    }
    res.set('Cache-Control', 'public, max-age=3600');
  }
}));

// 환경 설정 API
app.get('/config', (req, res) => {
  res.json({
    apiKey: config.GOOGLE_API.KEY,
    discoveryDocs: config.GOOGLE_API.DISCOVERY_DOCS,
    spreadsheetId: config.GOOGLE_API.SPREADSHEET_ID,
  });
});

// Redis 클라이언트 설정
const redisClient = redis.createClient({ url: config.REDIS.URL });
redisClient.connect().catch(console.error);
redisClient.setMaxListeners(20);

const store = new RedisStore({ 
    client: redisClient,
    prefix: config.REDIS.PREFIX
});
store.setMaxListeners(20);

// CORS 설정
app.use(cors({
  origin: (origin, callback) => {
    if (!origin || config.CORS.ALLOWED_ORIGINS.includes(origin)) {
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

// CSP 설정
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", config.getCSPString());
  next();
});

app.set('trust proxy', 1);

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
  secret: config.SESSION.SECRET,
  resave: false,
  saveUninitialized: false,
  cookie: {
      secure: config.SERVER.PRODUCTION,
      httpOnly: true,
      sameSite: 'none',
      domain: config.SESSION.COOKIE.DOMAIN,
      maxAge: config.SESSION.COOKIE.MAX_AGE
  }
}));

// 요청 정보 로깅
app.use((req, res, next) => {
  console.log(`요청 프로토콜: ${req.protocol}`);
  console.log(`요청 도메인: ${req.hostname}`);
  if (config.SERVER.ENV === 'development') {
    console.log(`세션 상태:`, req.session);
  }
  next();
});

// 인증 미들웨어
const authenticateUser = (req, res, next) => {
  const token = req.cookies.token;

  if (token) {
    jwt.verify(token, config.JWT.SECRET, (err, user) => {
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
  res.locals.role = req.session?.role || config.Roles.GUEST;
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
  sheets = google.sheets({ version: 'v4', auth: config.GOOGLE_API.KEY });
}

async function getSheetData(range) {
  if (!sheets) {
    await initGoogleSheets();
  }

  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: config.GOOGLE_API.SPREADSHEET_ID,
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

// API 함수 내보내기
module.exports = { getSheetData };

// =====================================================================
// 라우터 등록
// =====================================================================
// 페이지 라우터 등록
const routes = {
  'auth': require('./lib_login/auth'),
  'admin': require('./routes/adminRouter'),
  'board': require('./routes/boardRouter'),
  'kinder': require('./routes/kinderRouter'),
  'learning': require('./routes/learningRouter'),
  'report': require('./routes/reportRouter'),
  'onlineclass': require('./routes/onlineclassRouter'),
  'entry': require('./routes/entryRouter'),
  'machinelearning': require('./routes/machinelearningRouter'),
  'python': require('./routes/pythonRouter')
};

// API 라우터 등록 (새로 분리된 API)
app.use('/api', require('./routes/apiRouter'));

// 페이지 라우터 등록 - 여기에서 인증 미들웨어만 적용하고 권한 체크는 각 라우터에서 처리
Object.entries(routes).forEach(([path, router]) => {
  if (path === 'auth') {
    // 인증 라우터는 인증 미들웨어 없이 등록
    app.use(`/${path}`, router);
  } else {
    // 다른 모든 라우터에 인증 미들웨어만 적용
    app.use(`/${path}`, authenticateUser, router);
  }
});

// =====================================================================
// 로그인/로그아웃 라우트
// =====================================================================

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

// 로그아웃 라우트
app.get('/logout', (req, res) => {
  req.session.destroy(err => {
    if (err) {
      return res.status(500).send('로그아웃 실패');
    }
    res.clearCookie('token', { domain: config.SESSION.COOKIE.DOMAIN, path: '/' });
    res.redirect('/auth/login');
  });
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
  res.redirect(config.SERVICES.SCRATCH);
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

// 앱인벤터 페이지 라우트
app.get('/appinventor', authenticateUser, (req, res) => {
  res.render('appinventor', {
    userID: req.session.userID || null,
    is_logined: req.session.is_logined || false,
    role: req.session.role || 'guest'
  });
});

// 알고리즘 페이지 라우트
app.get('/algorithm', authenticateUser, (req, res) => {
  res.render('algorithm', {
    userID: req.session.userID || null,
    is_logined: req.session.is_logined || false,
    role: req.session.role || 'guest'
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

// 정적 자원 제공
app.use('/resource', express.static(path.join(__dirname, 'public', 'resource')));
app.use('/node_modules/bootstrap-icons', express.static(path.join(__dirname, 'node_modules/bootstrap-icons')));
app.use('/js/turn.js', express.static(path.join(__dirname, 'node_modules/turn.js/turn.min.js')));

// 매일 자정 구독 상태 업데이트
cron.schedule(config.CRON.SUBSCRIPTION_UPDATE, async () => {
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

// 기본 라우트 (페이지가 없을 때)
app.get('*', authenticateUser, (req, res) => {
  res.render('index');
});

// 오류 처리 미들웨어
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

// 서버 시작 함수
function startServer(port) {
  const server = app.listen(port)
    .on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        console.log(`Port ${port} is in use, trying ${port + 1}...`);
        startServer(port + 1);
      } else {
        console.error('Error starting server:', err);
      }
    })
    .on('listening', () => {
      console.log(`Server is running on ${config.SERVER.PRODUCTION ? 'https' : 'http'}://localhost:${port}`);
      console.log(`Environment: ${config.SERVER.ENV}`);
    });
}

// 서버 시작
startServer(config.SERVER.PORT);