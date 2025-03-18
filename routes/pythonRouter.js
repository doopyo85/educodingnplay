// pythonRouter.js에 메인 페이지 처리 추가
const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');
const { checkPageAccess } = require('../lib_login/authMiddleware');

// 파이썬 메인 페이지
router.get('/', 
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