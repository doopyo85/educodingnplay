const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const FileStore = require('session-file-store')(session);
const fs = require('fs');
const path = require('path');

var authRouter = require('./lib_login/auth');
var authCheck = require('./lib_login/authCheck.js');
var template = require('./lib_login/template.js');

const app = express();
const port = 3000;

app.use(bodyParser.urlencoded({ extended: false }));
app.use(session({
  secret: 'your-secret-key',
  resave: false,
  saveUninitialized: true,
  store: new FileStore(),
}));

// Content Security Policy 헤더 설정
app.use((req, res, next) => {
  res.setHeader("Content-Security-Policy", "default-src 'self'; font-src 'self' data:; script-src 'self' 'unsafe-inline' 'unsafe-eval'; style-src 'self' 'unsafe-inline'");
  return next();
});

app.get('/', (req, res) => {
  if (!authCheck.isOwner(req, res)) {
    res.redirect('/auth/login');
    return false;
  } else {
    res.redirect('/main');
    return false;
  }
});

app.use('/auth', authRouter);

app.get('/main', (req, res) => {
  if (!authCheck.isOwner(req, res)) {
    res.redirect('/auth/login');
    return false;
  }
  
  fs.readFile(path.join(__dirname, 'educodingnplay.html'), 'utf8', (err, data) => {
    if (err) {
      res.status(500).send('Internal Server Error');
      return;
    }
    var html = data.replace('로그인정보미확인', `${req.session.nickname}님 환영합니다`);
    res.send(html);
  });
});

app.get('/get-user', (req, res) => {
  if (!authCheck.isOwner(req, res)) {
    res.json({ email: '로그인정보미확인' });
  } else {
    res.json({ email: req.session.nickname });
  }
});

app.get('/scratch', (req, res) => {
  if (!authCheck.isOwner(req, res)) {
    res.redirect('/auth/login');
    return false;
  }
  
  const scratchGuiUrl = `http://3.34.127.154:8601?scratchSession=${req.sessionID}`;
  res.redirect(scratchGuiUrl);
});

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`);
});
