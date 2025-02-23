const express = require('express');
const path = require('path');
const session = require('express-session');
const app = express();
const PORT = 8080;

app.use(session({
    secret: 'your-secret-key',
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: true,
        sameSite: 'none'
    }
}));

app.use((req, res, next) => {
    res.setHeader(
        'Content-Security-Policy',
        "default-src 'self' https: cdn.jsdelivr.net code.createjs.com cdnjs.cloudflare.com; " +
        "font-src 'self' data: https: *; " +
        "script-src 'self' 'unsafe-inline' 'unsafe-eval' https: cdn.jsdelivr.net code.createjs.com cdnjs.cloudflare.com; " +
        "style-src 'self' 'unsafe-inline' https: cdn.jsdelivr.net cdnjs.cloudflare.com; " +
        "img-src 'self' data: https: *; " +
        "connect-src 'self' https: wss: ws:;"
    );
    next();
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));
app.use(express.static(path.join(__dirname, '../public')));

// 메인 라우트 - 엔트리 에디터 표시
app.get('/', async (req, res) => {
    const projectFile = req.query.project_file;
    res.render('entry_editor', {
        userID: req.session?.userID || null,
        is_logined: req.session?.is_logined || false,
        role: req.session?.role || 'student',
        centerID: req.session?.centerID || null,
        projectFile: projectFile || null
    });
});

// 프로젝트 목록 페이지
app.get('/project', (req, res) => {
    res.render('entry_project', {
        userID: req.session?.userID || null,
        is_logined: req.session?.is_logined || false,
        role: req.session?.role || 'student',
        centerID: req.session?.centerID || null
    });
});

app.listen(PORT, () => {
    console.log(`Entry server is running on port ${PORT}`);
});