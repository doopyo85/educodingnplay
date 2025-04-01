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

// 구글 시트 데이터 API
router.get('/get-ml-data', async (req, res) => {
  try {
    const data = await getSheetData('ml!A2:E'); 
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

// Books data API - new endpoint for the books sheet
router.get('/get-books-data', async (req, res) => {
  try {
    const data = await getSheetData('books!A2:F'); // Adjust column range A-F for the books sheet
    res.json(data);
  } catch (error) {
    console.error('교재 데이터 불러오기 오류:', error);
    res.status(500).json({ error: '교재 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// CT elements data API - endpoint for the report sheet
router.get('/get-report-data', async (req, res) => {
  try {
    const data = await getSheetData('report!A2:G'); // Adjust column range A-G for the report sheet
    res.json(data);
  } catch (error) {
    console.error('CT요소 데이터 불러오기 오류:', error);
    res.status(500).json({ error: 'CT요소 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// Fetch CT elements for a specific book
// apiRouter.js에 추가할 새 API 엔드포인트
// 교재별 CT요소 데이터 API
router.get('/get-ct-elements/:category/:volume', async (req, res) => {
  try {
    const { category, volume } = req.params;
    
    // Google Sheets에서 데이터 가져오기
    const data = await getSheetData('report!A2:F');
    
    // 카테고리 정규화 함수
    const normalizeCategory = (cat) => {
      if (cat.toLowerCase().includes('preschool') || cat.toLowerCase().includes('프리스쿨')) {
        return '프리스쿨';
      } else if (cat.toLowerCase().includes('junior') || cat.toLowerCase().includes('주니어')) {
        return '주니어';
      }
      return cat;
    };
    
    // 볼륨 정규화 및 파싱 (LV 및 호수 추출)
    const parseVolume = (vol) => {
      // LV 숫자 추출
      let level = null;
      const lvMatch = vol.match(/lv(\d+)/i);
      if (lvMatch) {
        level = parseInt(lvMatch[1]);
      }
      
      // 호수 추출
      let issueNumber = null;
      let issueMatch = vol.match(/[-_](\d+)호$/);
      if (!issueMatch) {
        issueMatch = vol.match(/(\d+)호$/);
      }
      if (!issueMatch) {
        issueMatch = vol.match(/(\d+)$/);
      }
      
      if (issueMatch) {
        issueNumber = parseInt(issueMatch[1]);
      }
      
      return { level, issueNumber };
    };
    
    // 요청된 볼륨 파싱
    const requestedVolume = parseVolume(volume);
    console.log(`요청된 볼륨 파싱 결과: LV ${requestedVolume.level}, ${requestedVolume.issueNumber}호`);
    
    // 정규화된 카테고리
    const normalizedCategory = normalizeCategory(category);
    
    // 카테고리와 볼륨에 맞는 항목 필터링
    const filteredItems = data.filter(item => {
      // 항목의 카테고리와 볼륨 파싱
      const itemCategory = normalizeCategory(item[1] || '');
      const itemVolume = parseVolume(item[2] || '');
      
      // 로그로 확인
      // console.log(`항목: ${itemCategory} LV${itemVolume.level}-${itemVolume.issueNumber}호 vs 요청: ${normalizedCategory} LV${requestedVolume.level}-${requestedVolume.issueNumber}호`);
      
      // 카테고리 확인 (프리스쿨/주니어의 경우 LV도 확인)
      const categoryMatch = itemCategory.includes(normalizedCategory);
      
      // 프리스쿨/주니어의 경우 LV와 호수 모두 확인
      if (normalizedCategory === '프리스쿨' || normalizedCategory === '주니어') {
        return categoryMatch && 
               itemVolume.level === requestedVolume.level && 
               itemVolume.issueNumber === requestedVolume.issueNumber;
      }
      
      // 다른 교재의 경우 호수만 확인
      return categoryMatch && itemVolume.issueNumber === requestedVolume.issueNumber;
    });
    
    // 결과 구성
    const result = filteredItems.map(item => ({
      id: item[0],
      category: item[1],
      volume: item[2],
      lessonName: item[3],
      ctElement: item[4],
      evaluationItem: item[5]
    }));
    
    console.log(`CT 요소 데이터 API 응답: ${result.length}개 항목 찾음`);
    res.json(result);
  } catch (error) {
    console.error('CT 요소 데이터 불러오기 오류:', error);
    res.status(500).json({ error: 'CT 요소 데이터를 불러오는 중 오류가 발생했습니다.' });
  }
});

// 교재 정보와 함께 CT요소 데이터 제공 API
router.get('/book-ct-elements/:category/:volume', async (req, res) => {
  try {
    const { category, volume } = req.params;
    
    // 1. 교재 정보 가져오기
    const booksData = await getSheetData('books!A2:F');
    
    // 볼륨 정규화 및 파싱 함수
    const parseVolume = (vol) => {
      // LV 숫자 추출
      let level = null;
      const lvMatch = vol.match(/lv(\d+)/i);
      if (lvMatch) {
        level = parseInt(lvMatch[1]);
      }
      
      // 호수 추출
      let issueNumber = null;
      let issueMatch = vol.match(/[-_](\d+)호$/);
      if (!issueMatch) {
        issueMatch = vol.match(/(\d+)호$/);
      }
      if (!issueMatch) {
        issueMatch = vol.match(/(\d+)$/);
      }
      
      if (issueMatch) {
        issueNumber = parseInt(issueMatch[1]);
      }
      
      return { level, issueNumber };
    };
    
    // 카테고리 정규화 함수
    const normalizeCategory = (cat) => {
      if (cat.toLowerCase().includes('preschool') || cat.toLowerCase().includes('프리스쿨')) {
        return '프리스쿨';
      } else if (cat.toLowerCase().includes('junior') || cat.toLowerCase().includes('주니어')) {
        return '주니어';
      }
      return cat;
    };
    
    // 요청된 볼륨 파싱
    const requestedVolume = parseVolume(volume);
    
    // 정규화된 카테고리
    const normalizedReqCategory = normalizeCategory(category);
    
    // 교재 정보 찾기
    let bookInfo = null;
    
    for (const book of booksData) {
      const bookCategory = normalizeCategory(book[1] || '');
      const bookVolume = parseVolume(book[2] || '');
      
      // 로그로 일치 여부 확인
      // console.log(`교재: ${bookCategory} LV${bookVolume.level}-${bookVolume.issueNumber}호 vs 요청: ${normalizedReqCategory} LV${requestedVolume.level}-${requestedVolume.issueNumber}호`);
      
      if (bookCategory.includes(normalizedReqCategory)) {
        // 프리스쿨/주니어의 경우 LV와 호수 모두 확인
        if (normalizedReqCategory === '프리스쿨' || normalizedReqCategory === '주니어') {
          if (bookVolume.level === requestedVolume.level && 
              bookVolume.issueNumber === requestedVolume.issueNumber) {
            bookInfo = {
              id: book[0],
              category: book[1],
              volume: book[2],
              title: book[3],
              description: book[4],
              thumbnail: book[5]
            };
            break;
          }
        } else {
          // 다른 교재의 경우 호수만 확인
          if (bookVolume.issueNumber === requestedVolume.issueNumber) {
            bookInfo = {
              id: book[0],
              category: book[1],
              volume: book[2],
              title: book[3],
              description: book[4],
              thumbnail: book[5]
            };
            break;
          }
        }
      }
    }
    
    // 2. CT 요소 데이터 가져오기
    const ctData = await getSheetData('report!A2:F');
    
    // CT 요소 필터링
    const ctElements = ctData.filter(item => {
      const itemCategory = normalizeCategory(item[1] || '');
      const itemVolume = parseVolume(item[2] || '');
      
      // 로그로 확인
      // console.log(`CT항목: ${itemCategory} LV${itemVolume.level}-${itemVolume.issueNumber}호 vs 요청: ${normalizedReqCategory} LV${requestedVolume.level}-${requestedVolume.issueNumber}호`);
      
      // 카테고리 확인
      const categoryMatch = itemCategory.includes(normalizedReqCategory);
      
      // 프리스쿨/주니어의 경우 LV와 호수 모두 확인
      if (normalizedReqCategory === '프리스쿨' || normalizedReqCategory === '주니어') {
        return categoryMatch && 
               itemVolume.level === requestedVolume.level && 
               itemVolume.issueNumber === requestedVolume.issueNumber;
      }
      
      // 다른 교재의 경우 호수만 확인
      return categoryMatch && itemVolume.issueNumber === requestedVolume.issueNumber;
    }).map(item => ({
      id: item[0],
      category: item[1],
      volume: item[2],
      lessonName: item[3],
      ctElement: item[4],
      evaluationItem: item[5]
    }));
    
    // 3. 응답 데이터 구성
    const response = {
      book: bookInfo || { title: '정보 없음', thumbnail: null },
      ctElements: ctElements,
      meta: {
        category: normalizedReqCategory,
        level: requestedVolume.level,
        issueNumber: requestedVolume.issueNumber
      }
    };
    
    console.log(`교재 및 CT 요소 데이터 API 응답: ${ctElements.length}개 항목 찾음`);
    res.json(response);
  } catch (error) {
    console.error('교재 및 CT 요소 데이터 불러오기 오류:', error);
    res.status(500).json({ 
      error: '교재 및 CT 요소 데이터를 불러오는 중 오류가 발생했습니다.',
      message: error.message 
    });
  }
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

// apiRouter.js에 추가/수정
router.post('/save-profile-preference', (req, res) => {
  try {
      const { profilePath } = req.body;
      const userId = req.session?.userID;
      
      if (!userId) {
          return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
      }
      
      // 세션에 프로필 이미지 경로 저장
      req.session.profileImage = profilePath;
      
      // 세션 저장
      req.session.save(err => {
          if (err) {
              console.error('세션 저장 오류:', err);
              return res.status(500).json({ success: false, message: '세션 저장 중 오류가 발생했습니다.' });
          }
          return res.json({ success: true, message: '프로필이 저장되었습니다.' });
      });
  } catch (error) {
      console.error('프로필 저장 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// apiRouter.js에 추가
// 프로필 정보 가져오기 API
router.get('/get-profile-info', (req, res) => {
  try {
      if (!req.session?.userID) {
          return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
      }
      
      // DB에서 사용자의 프로필 이미지 경로 조회
      db.queryDatabase(
          'SELECT profile_image FROM Users WHERE userID = ?', 
          [req.session.userID]
      )
      .then(results => {
          if (results.length > 0 && results[0].profile_image) {
              return res.json({ 
                  success: true, 
                  profilePath: results[0].profile_image 
              });
          } else {
              return res.json({ 
                  success: true, 
                  profilePath: '/resource/profiles/default.webp' 
              });
          }
      })
      .catch(error => {
          console.error('프로필 정보 조회 오류:', error);
          return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
      });
  } catch (error) {
      console.error('프로필 정보 조회 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});

// 프로필 DB에 저장
router.post('/save-profile-to-db', (req, res) => {
  try {
      const { profilePath } = req.body;
      const userId = req.session?.userID;
      
      if (!userId) {
          return res.status(401).json({ success: false, message: '로그인이 필요합니다.' });
      }
      
      // DB에 사용자의 프로필 이미지 경로 저장
      db.queryDatabase(
          'UPDATE Users SET profile_image = ? WHERE userID = ?', 
          [profilePath, userId]
      )
      .then(() => {
          // 세션에도 프로필 이미지 경로 저장
          req.session.profileImage = profilePath;
          
          // 세션 저장
          req.session.save(err => {
              if (err) {
                  console.error('세션 저장 오류:', err);
                  return res.status(500).json({ success: false, message: '세션 저장 중 오류가 발생했습니다.' });
              }
              return res.json({ success: true, message: '프로필이 저장되었습니다.' });
          });
      })
      .catch(error => {
          console.error('프로필 저장 오류:', error);
          return res.status(500).json({ success: false, message: '데이터베이스 오류가 발생했습니다.' });
      });
  } catch (error) {
      console.error('프로필 저장 오류:', error);
      return res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
});


module.exports = router;