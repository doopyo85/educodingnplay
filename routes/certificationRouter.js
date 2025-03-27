// routes/certificationRouter.js 파일 수정
const express = require('express');
const router = express.Router();
const { checkPageAccess } = require('../lib_login/authMiddleware');

// 자격증 취득 페이지 (메인 페이지)
router.get('/', 
  checkPageAccess('/certification'),
  (req, res) => {
    res.render('certification', {
      userID: req.session.userID,
      role: req.session.role,
      is_logined: req.session.is_logined,
      centerID: req.session.centerID
    });
  }
);

// API 부분 수정
router.get('/api/data', async (req, res) => {
  try {
    // getSheetData 함수를 server.js에서 가져오려고 했던 부분 수정
    const { getSheetData } = require('../server');
    const data = await getSheetData('certification!A2:E');
    res.json(data);
  } catch (error) {
    console.error('Error fetching certification data:', error);
    res.status(500).json({ error: '자격증 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 라우터 객체를 모듈로 내보내기
module.exports = router;