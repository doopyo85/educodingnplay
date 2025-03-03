const express = require('express');
const session = require('express-session');
const RedisStore = require('connect-redis').default;
const redis = require('redis');
const cors = require('cors');
const bodyParser = require('body-parser');
const cookieParser = require('cookie-parser');
const path = require('path');
const mime = require('mime-types');
const fs = require('fs');
const dotenv = require('dotenv');
const cron = require('node-cron');

dotenv.config();
const app = express();

// Redis 설정
const redisClient = redis.createClient({ url: 'redis://localhost:6379' });
redisClient.connect().catch(console.error);
redisClient.setMaxListeners(20);

const store = new RedisStore({
    client: redisClient,
    prefix: 'educodingnplay:sess:'
});
store.setMaxListeners(20);

// CORS 설정
const allowedOrigins = [
    'https://codingnplay.co.kr',
    'https://www.codingnplay.co.kr',
    'https://app.codingnplay.co.kr',
    'http://codingnplay.co.kr',
    'http://www.codingnplay.co.kr',
    undefined
];

app.use(cors({
    origin: (origin, callback) => {
        if (!origin || allowedOrigins.includes(origin)) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));

// 세션 설정
app.set('trust proxy', 1);
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

// 미들웨어 설정
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));
app.use(cookieParser());

// 정적 파일 제공 설정
app.use(express.static(path.join(__dirname, 'public'), {
    setHeaders: (res, filePath) => {
        const type = mime.lookup(filePath) || 'application/octet-stream';
        res.set('Content-Type', type);
        res.set('Cache-Control', 'public, max-age=3600');
    }
}));

// 뷰 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

// 보안 헤더 설정
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

// 라우터 설정
const routes = require('./routes');
app.use('/', routes);

// 리소스 제공
app.use('/js/turn.js', express.static(path.join(__dirname, 'node_modules/turn.js/turn.min.js')));
app.use('/resource', express.static(path.join(__dirname, 'public', 'resource')));
app.use('/node_modules/bootstrap-icons', express.static(path.join(__dirname, 'node_modules/bootstrap-icons')));

// MIME 타입 설정
app.use((req, res, next) => {
    const ext = path.extname(req.url).toLowerCase();
    switch (ext) {
        case '.js': res.type('application/javascript'); break;
        case '.css': res.type('text/css'); break;
        case '.json': res.type('application/json'); break;
        case '.png': res.type('image/png'); break;
        case '.jpg':
        case '.jpeg': res.type('image/jpeg'); break;
        case '.wav': res.type('audio/wav'); break;
    }
    next();
});

// HSTS 적용
app.use((req, res, next) => {
    res.setHeader('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
    next();
});

// 구독 상태 업데이트 (매일 자정 실행)
cron.schedule('0 0 * * *', async () => {
    try {
        const query = `
            UPDATE Users
            SET subscription_status = 'expired'
            WHERE subscription_expiry < CURDATE() AND subscription_status = 'active'
        `;
        await require('./lib_login/db').queryDatabase(query);
        console.log('구독 만료 상태 업데이트 완료');
    } catch (error) {
        console.error('구독 만료 상태 업데이트 중 오류:', error);
    }
});

// 모든 요청을 위한 미들웨어
app.use((req, res, next) => {
    console.log(`요청 프로토콜: ${req.protocol}, 요청 도메인: ${req.hostname}`);
    console.log(`세션 정보:`, req.session);
    next();
});

// 오류 처리 미들웨어
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 서버 시작
const DEFAULT_PORT = 3000;
let currentPort = DEFAULT_PORT;

function startServer(port) {
    app.listen(port, () => {
        console.log(`Server is running on http://localhost:${port}`);
    }).on('error', (err) => {
        if (err.code === 'EADDRINUSE') {
            console.log(`Port ${port} is in use, trying ${port + 1}...`);
            currentPort++;
            startServer(currentPort);
        } else {
            console.error('Error starting server:', err);
        }
    });
}

startServer(currentPort);
