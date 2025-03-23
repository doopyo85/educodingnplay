const express = require('express');
const router = express.Router();
const db = require('../lib_login/db');
const bcrypt = require('bcrypt');
const { checkRole } = require('../lib_login/authMiddleware');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

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
  console.log('GET /api/get-onlineclass-data 요청 받음');
  try {
    const data = await getSheetData('onlineClass!A2:C');
    res.json(data);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// Scratch 관련 API
router.get('/get-sb2-data', async (req, res) => {
  try {
    const data = await getSheetData('sb2!A2:F');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

router.get('/get-sb3-data', async (req, res) => {
  try {
    const data = await getSheetData('sb3!A2:F');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// Entry 관련 API
router.get('/get-ent-data', async (req, res) => {
  try {
    const data = await getSheetData('ent!A2:F');  
    res.json(data);
  } catch (error) {
    console.error('구글 시트 데이터 불러오기 오류:', error);
    res.status(500).json({ error: '엔트리 프로젝트 데이터를 불러오는 중 오류 발생' });
  }
});

// 앱인벤터 관련 API
router.get('/get-aia-data', async (req, res) => {
  try {
    const data = await getSheetData('aia!A2:F');  
    res.json(data);
  } catch (error) {
    console.error('구글 시트 데이터 불러오기 오류:', error);
    res.status(500).json({ error: '앱인벤터 프로젝트 데이터를 불러오는 중 오류 발생' });
  }
});


// 메뉴 데이터 API
router.get('/get-menu-data', async (req, res) => {
  try {
    const data = await getSheetData('pythonmenu!A2:C');
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

// 문제 데이터 API
router.get('/get-problem-data', async (req, res) => {
  try {
    const data = await getSheetData('problems!A:C');
    res.json(data);
  } catch (error) {
    res.status(500).json({ error: '문제 데이터를 불러오는 중 오류가 발생했습니다.' });
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

// Google Sheets API 사용 데이터

// 파이썬 데이터 API - 추가/수정
router.get('/get-python-data', async (req, res) => {
  try {
    const data = await getSheetData('pythonmenu!A2:E');
    res.json(data);
  } catch (error) {
    console.error('파이썬 데이터 불러오기 오류:', error);
    res.status(500).json({ error: '파이썬 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 알고리즘 데이터 API - 추가/수정
router.get('/get-algorithm-data', async (req, res) => {
  try {
    const data = await getSheetData('algorithm!A2:E');
    res.json(data);
  } catch (error) {
    console.error('알고리즘 데이터 불러오기 오류:', error);
    res.status(500).json({ error: '알고리즘 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 자격증 데이터 API
router.get('/get-certification-data', async (req, res) => {
  try {
    const data = await getSheetData('certification!A2:E'); // E로 변경
    res.json(data);
  } catch (error) {
    console.error('자격증 데이터 불러오기 오류:', error);
    res.status(500).json({ error: '자격증 데이터를 불러오는 중 오류가 발생했습니다.' });
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

// 프로필 업로드 디렉토리 설정
const profileUploadDir = path.join(__dirname, '../public/resource/profiles/uploads');

// 디렉토리가 없으면 생성
if (!fs.existsSync(profileUploadDir)) {
    fs.mkdirSync(profileUploadDir, { recursive: true });
}

// Multer 스토리지 설정
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, profileUploadDir);
    },
    filename: function (req, file, cb) {
        // 유저 ID를 파일명에 포함시키거나 고유 ID 생성
        const userId = req.session?.userID || 'guest';
        const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
        const ext = path.extname(file.originalname);
        cb(null, `profile-${userId}-${uniqueSuffix}${ext}`);
    }
});

// 파일 필터 (이미지만 허용)
const fileFilter = (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
        cb(null, true);
    } else {
        cb(new Error('이미지 파일만 업로드 가능합니다'), false);
    }
};

// 업로드 설정
const upload = multer({ 
    storage: storage,
    limits: {
        fileSize: 1024 * 1024 // 1MB 제한
    },
    fileFilter: fileFilter
});

// 프로필 이미지 업로드 API
router.post('/upload-profile', upload.single('profileImage'), (req, res) => {
    try {
        if (!req.file) {
            return res.status(400).json({ success: false, message: '파일이 업로드되지 않았습니다.' });
        }
        
        // 업로드된 파일 경로
        const imagePath = `/resource/profiles/uploads/${req.file.filename}`;
        
        // 여기서 필요하다면 DB에 사용자의 프로필 이미지 경로 저장
        // ex: db.queryDatabase('UPDATE Users SET profile_image = ? WHERE userID = ?', [imagePath, req.session.userID]);
        
        return res.json({ success: true, imagePath: imagePath });
    } catch (error) {
        console.error('프로필 업로드 오류:', error);
        return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

// 프로필 선택 저장 API
router.post('/save-profile-preference', (req, res) => {
    try {
        const { profilePath } = req.body;
        const userId = req.session?.userID;
        
        if (!userId) {
            return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
        }
        
        // 여기서 필요하다면 DB에 사용자의 프로필 이미지 경로 저장
        // ex: db.queryDatabase('UPDATE Users SET profile_image = ? WHERE userID = ?', [profilePath, userId]);
        
        return res.json({ success: true });
    } catch (error) {
        console.error('프로필 저장 오류:', error);
        return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
    }
});

module.exports = router;