const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const { checkPageAccess } = require('../lib_login/authMiddleware');

// 메인 페이지 라우트 (권한 체크 추가)
router.get('/', checkPageAccess('/python'), (req, res) => {
  console.log('Python 메인 페이지 렌더링 시작');
  res.render('python_project', {
    userID: req.session.userID,
    userRole: req.session.role,
    is_logined: req.session.is_logined,
    centerID: req.session.centerID
  });
});

// 파이썬 코드 실행 API
router.post('/run-python', (req, res) => {
    const userCode = req.body.code;
    const path = './temp.py';

    fs.writeFileSync(path, userCode);

    exec(`python3 ${path}`, (error, stdout, stderr) => {
        if (error) return res.json({ output: `Error: ${error.message}` });
        if (stderr) return res.json({ output: `stderr: ${stderr}` });

        res.json({ output: stdout });
    });
});

module.exports = router;