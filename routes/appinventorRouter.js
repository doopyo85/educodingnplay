// routes/appinventorRouter.js - 앱인벤터 프로젝트 관련 라우터

const express = require('express');
const router = express.Router();
const { checkPageAccess } = require('../lib_login/authMiddleware');

// 앱인벤터 페이지 (메인 페이지)
router.get('/', 
  checkPageAccess('/appinventor_project'),
  (req, res) => {
    res.render('appinventor', {
      userID: req.session.userID,
      userRole: req.session.role,
      is_logined: req.session.is_logined,
      centerID: req.session.centerID
    });
  }
);

// 앱인벤터 프로젝트 데이터 API 엔드포인트
router.get('/api/data', async (req, res) => {
  try {
    // 서버에서 가져온 getSheetData 함수 사용
    const getSheetData = req.app.get('getSheetData');
    const data = await getSheetData('appinventor!A2:E');
    res.json(data);
  } catch (error) {
    console.error('Error fetching appinventor data:', error);
    res.status(500).json({ error: '앱인벤터 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

module.exports = router;