// routes/certificationRouter.js - 자격증 취득 관련 라우터

const express = require('express');
const router = express.Router();
const { checkPageAccess } = require('../lib_login/authMiddleware');
// 서버에서 직접 getSheetData 함수를 가져오지 않고 req.app.get()을 사용

// 자격증 취득 페이지 (메인 페이지)
router.get('/', 
  checkPageAccess('/certification'),
  (req, res) => {
    res.render('certification', {
      userID: req.session.userID,
      userRole: req.session.role,
      is_logined: req.session.is_logined,
      centerID: req.session.centerID
    });
  }
);

// 자격증 데이터 API 엔드포인트
router.get('/api/data', async (req, res) => {
  try {
    const data = await getSheetData('certification!A2:E');
    res.json(data);
  } catch (error) {
    console.error('Error fetching certification data:', error);
    res.status(500).json({ error: '자격증 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 학습 이력 기록 API
router.post('/api/track', (req, res) => {
  const { userId, contentId, progress } = req.body;
  
  // 여기에 학습 이력을 기록하는 코드 추가
  // 예: DB에 저장, 로그 기록 등
  
  res.json({ success: true });
});

module.exports = router;