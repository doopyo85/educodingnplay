const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();
const PORT = 8080;

// 뷰 엔진 설정
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

// CSP 설정
app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        [
            "default-src 'self' https: blob: data: entry-cdn.pstatic.net *.playentry.org",
            "script-src 'self' 'unsafe-inline' 'unsafe-eval' blob: https: unpkg.com playentry.org entry-cdn.pstatic.net",
            "style-src 'self' 'unsafe-inline' https: playentry.org *.playentry.org",
            "img-src 'self' blob: data: https: *",
            "media-src 'self' blob: data: https: *",
            "worker-src 'self' 'unsafe-inline' blob: data: https: *",
            "child-src 'self' blob: data: https: *",
            "frame-src 'self' blob: data: https: *",
            "font-src 'self' blob: data: https: *",
            "connect-src 'self' https: wss: ws: *"
        ].join('; ')
    );
    next();
});

// 정적 파일 제공
app.use(express.static(path.join(__dirname, '../public')));

// 세션 설정
app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true,
        sameSite: 'none'
    }
}));

// 메인 라우트
app.get('/', (req, res) => {
    res.render('entry_editor', {
        userID: req.session?.userID || null,
        is_logined: req.session?.is_logined || false,
        role: req.session?.role || 'student',
        centerID: req.session?.centerID || null,
        projectFile: null,
        baseUrl: 'https://app.codingnplay.co.kr'
    });
});

// Entry 프로젝트 목록 페이지
app.get('/entry_project', (req, res) => {
    res.render('entry_project', {
        userID: req.session?.userID || null,
        is_logined: req.session?.is_logined || false,
        role: req.session?.role || 'student',
        centerID: req.session?.centerID || null
    });
});

// Entry 뷰어 페이지
app.get('/entry', (req, res) => {
    try {
        const projectFile = req.query.project_file;
        res.render('entry_editor', {
            userID: req.session?.userID || null,
            is_logined: req.session?.is_logined || false,
            role: req.session?.role || 'student',
            centerID: req.session?.centerID || null,
            projectFile: projectFile || null,
            baseUrl: 'https://app.codingnplay.co.kr'
        });
    } catch (error) {
        console.error('Entry 라우트 오류:', error);
        res.status(500).json({ error: error.message });
    }
});

// 404 핸들러
app.use((req, res, next) => {
    console.log('404 Error for:', req.url);
    res.status(404).render('404');
});

// 에러 핸들러
app.use((err, req, res, next) => {
    console.error('Server Error:', err);
    res.status(500).render('404', { error: err });
});

// 서버 시작
app.listen(PORT, () => {
    console.log(`Entry server is running on port ${PORT}`);
    console.log('Views directory:', path.join(__dirname, '../views'));
});

module.exports = app;