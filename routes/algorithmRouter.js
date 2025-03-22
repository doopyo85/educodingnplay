// routes/algorithmRouter.js - 알고리즘 학습 관련 라우터

const express = require('express');
const router = express.Router();
const { checkPageAccess } = require('../lib_login/authMiddleware');

// 알고리즘 학습 페이지 (메인 페이지)
router.get('/', 
  checkPageAccess('/algorithm'),
  (req, res) => {
    res.render('algorithm', {
      userID: req.session.userID,
      userRole: req.session.role,
      is_logined: req.session.is_logined,
      centerID: req.session.centerID
    });
  }
);

// 알고리즘 데이터 API 엔드포인트
router.get('/api/data', async (req, res) => {
  try {
    // 서버에서 가져온 getSheetData 함수 사용
    const getSheetData = req.app.get('getSheetData');
    const data = await getSheetData('algorithm!A2:E');
    res.json(data);
  } catch (error) {
    console.error('Error fetching algorithm data:', error);
    res.status(500).json({ error: '알고리즘 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

module.exports = router;