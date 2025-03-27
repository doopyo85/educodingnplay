// routes/certificationRouter.js 수정
const express = require('express');
const router = express.Router();
const { checkPageAccess } = require('../lib_login/authMiddleware');
const { getSheetData } = require('../server'); // 함수 임포트 추가

// 자격증 취득 페이지 (메인 페이지)
router.get('/', 
  checkPageAccess('/certification'),
  (req, res) => {
    console.log('Certification 페이지 렌더링 - 세션 정보:', {
      userID: req.session?.userID,
      role: req.session?.role
    });
    
    res.render('certification', {
      userID: req.session?.userID,
      role: req.session?.role, // userRole에서 role로 변경
      is_logined: req.session?.is_logined,
      centerID: req.session?.centerID
    });
  }
);

// API 부분도 수정
router.get('/api/data', async (req, res) => {
  try {
    const getSheetData = req.app.get('getSheetData'); // 서버에서 등록한 함수 가져오기
    const data = await getSheetData('certification!A2:E');
    res.json(data);
  } catch (error) {
    console.error('Error fetching certification data:', error);
    res.status(500).json({ error: '자격증 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});