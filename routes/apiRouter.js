const express = require('express');
const router = express.Router();
const db = require('../lib_login/db');
const bcrypt = require('bcrypt');
const { checkRole } = require('../lib_login/authMiddleware');

// Google Sheets 함수는 server.js에서 가져옵니다
const { getSheetData } = require('../server');

// 사용자 관련 API
router.get('/get-user', (req, res) => {
  if (req.session && req.session.userID) {
    res.json({ username: req.session.userID });
  } else {
    res.status(401).json({ error: '인증되지 않은 사용자' });
  }
});

router.get('/get-user-type', (req, res) => {
  if (req.session && req.session.userID) {
    res.json({ userType: req.session.userType });
  } else {
    res.status(401).json({ error: '로그인되지 않은 사용자입니다.' });
  }
});

router.get('/get-user-session', (req, res) => {
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

// 구글 시트 데이터 API
router.get('/get-computer-data', async (req, res) => {
  try {
    const data = await getSheetData('computer!A2:E'); 
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

router.get('/get-onlineclass-data', async (req, res) => {
  try {
    const data = await getSheetData('onlineClass!A2:C');
    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});


router.get('/get-sb2-data', 
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

router.get('/get-sb3-data', 
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

router.get('/get-ent-data', 
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

router.get('/get-menu-data', async (req, res) => {
  try {
    const data = await getSheetData('menulist!A2:C');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '메뉴 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

router.get('/get-teachermenu-data', async (req, res) => {
  try {
    const data = await getSheetData('teacher!A2:h');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '메뉴 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

router.get('/get-problem-data', async (req, res) => {
  try {
    const data = await getSheetData('문항정보!A:C');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '문제 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

router.get('/get-books-data', async (req, res) => {
  try {
    const data = await getSheetData('books!A2:e');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '책 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// Tasks 가져오기(너구리톡)
router.get('/get-task-data', async (req, res) => {
  try {
    const data = await getSheetData('Tasks!A2:C');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '업무 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// Python 코드 실행 API
router.post('/run-python', (req, res) => {
  const { exec } = require('child_process');
  const fs = require('fs');
  const path = require('path');
  const userCode = req.body.code;
  const tempPath = path.join(__dirname, '../temp.py');
  
  fs.writeFileSync(tempPath, userCode);

  exec(`python3 ${tempPath}`, (error, stdout, stderr) => {
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

module.exports = router;