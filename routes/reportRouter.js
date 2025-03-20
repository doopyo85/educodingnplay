// 월간 학습 리포트 POD 기능을 위한 라우터
const express = require('express');
const router = express.Router();
const { getSheetData } = require('../server'); // server.js에서 내보낸 함수 사용
const { authenticateUser } = require('../lib_login/authMiddleware');

// 캐시 저장소
let reportDataCache = null;
let lastCacheUpdate = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간(1일) 캐시 유효기간

// 캐시 업데이트 함수
async function updateReportCache() {
    try {
        console.log('Updating report data cache from Google Sheets...');
        const sheetData = await getSheetData('report!A1:Z1000'); // 전체 데이터 범위 가져오기
        
        if (!sheetData || !Array.isArray(sheetData) || sheetData.length === 0) {
            console.error('Failed to fetch report data: Empty or invalid response');
            return false;
        }
        
        // 헤더 행 추출
        const headers = sheetData[0];
        
        // 데이터 객체로 변환 (헤더를 키로 사용)
        const parsedData = sheetData.slice(1).map(row => {
            const item = {};
            headers.forEach((header, index) => {
                item[header] = row[index] || '';
            });
            return item;
        });
        
        // 고정된 교재 정보 설정 (구글 시트에서 누락된 경우를 대비)
        const fixedBooks = {
            'CPS': 6,  // CPS는 6개 호
            'CPA': 3,  // CPA는 3개 호
            '앱인벤터': 5,  // 앱인벤터는 5개 호 (6에서 5로 수정)
            '파이썬': 3,  // 파이썬은 3개 호
            '프리스쿨 LV1': 12,  // 프리스쿨 LV1은 12개 호
            '프리스쿨 LV2': 12,  // 프리스쿨 LV2는 12개 호
            '프리스쿨 LV3': 12,  // 프리스쿨 LV3는 12개 호
            '주니어 LV1': 12,  // 주니어 LV1은 12개 호
            '주니어 LV2': 12   // 주니어 LV2는 12개 호
        };
        
        // 데이터를 카테고리별로 정리
        const categorizedData = {};
        
        // 먼저 고정된 교재 카테고리 생성
        Object.keys(fixedBooks).forEach(category => {
            categorizedData[category] = [];
            // 각 카테고리별 호수 생성
            for (let i = 1; i <= fixedBooks[category]; i++) {
                categorizedData[category].push({
                    category: category,
                    volume: i.toString(),
                    title: `${category} ${i}호`,
                    thumbnail_url: ''
                });
            }
        });
        
        // 구글 시트 데이터로 추가 정보 업데이트 (썸네일 URL 등)
        parsedData.forEach(item => {
            // 구글 시트의 컬럼명을 확인
            const category = item['교재카테고리'] || '기타';
            
            // 레벨-호 형식에서 볼륨(호수) 추출
            let volume = '1';
            if (item['교재레벨-호']) {
                const parts = item['교재레벨-호'].split('-');
                if (parts.length > 1) {
                    volume = parts[1];
                }
            }
            
            // 썸네일 URL 업데이트
            if (categorizedData[category]) {
                const existingVolume = categorizedData[category].find(book => 
                    book.volume === volume
                );
                
                if (existingVolume && item['thumbnail_url']) {
                    existingVolume.thumbnail_url = item['thumbnail_url'];
                }
            }
        });
        
        // 캐시 저장 및 타임스탬프 업데이트
        reportDataCache = categorizedData;
        lastCacheUpdate = Date.now();
        console.log(`Report data cache updated with fixed book counts`);
        return true;
    } catch (error) {
        console.error('Error updating report cache:', error);
        return false;
    }
}

// 캐시된 데이터 가져오기
async function getReportData() {
    // 캐시가 없거나 만료된 경우 업데이트
    if (!reportDataCache || !lastCacheUpdate || (Date.now() - lastCacheUpdate) > CACHE_TTL) {
        const success = await updateReportCache();
        if (!success && !reportDataCache) {
            throw new Error('Failed to initialize report data cache');
        }
    }
    
    return reportDataCache;
}

// 서버 시작 시 캐시 초기화
updateReportCache().catch(err => {
    console.error('Initial cache update failed:', err);
});

// 일별 새벽 4시에 캐시 자동 갱신
setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 4 && now.getMinutes() === 0) {
        console.log('Scheduled cache update...');
        await updateReportCache();
    }
}, 60000); // 1분마다 확인

// 웹 페이지: 교재 목록 페이지 (중복 라우트 제거, 아래 하나만 남기기)
router.get('/books-page', authenticateUser, (req, res) => {
    console.log('books-page 라우트 처리');
    res.render('report/report_bookslist', { 
      userID: req.session?.userID || null,
      is_logined: req.session?.is_logined || false,
      role: req.session?.role || 'guest'
    });
});

// API 엔드포인트: 교재 카테고리 및 목록 가져오기
router.get('/books', authenticateUser, async (req, res) => {
    try {
        const reportData = await getReportData();
        res.json(reportData);
    } catch (error) {
        console.error('Error fetching book list:', error);
        res.status(500).json({ error: '교재 목록을 불러오는 중 오류가 발생했습니다.' });
    }
});

// API 엔드포인트: 특정 교재 정보 및 평가 항목 가져오기
router.get('/book/:category/:volume', authenticateUser, async (req, res) => {
    console.log(`교재 정보 요청 받음: 카테고리=${req.params.category}, 볼륨=${req.params.volume}`);
    
    try {
        const { category, volume } = req.params;
        
        // 시트 데이터 가져오기
        const sheetData = await getSheetData('report!A1:H1000');
        console.log(`시트 데이터 수신: ${sheetData ? sheetData.length : 0}행`);
        
        if (!sheetData || !Array.isArray(sheetData) || sheetData.length <= 1) {
            console.error('시트 데이터가 없거나 불충분합니다');
            return res.status(404).json({ error: '데이터를 찾을 수 없습니다.' });
        }
        
        // 인덱스 설정
        const noIndex = 0;  // 'NO' 열 (A열)
        const categoryIndex = 1;  // '교재카테고리' 열 (B열)
        const volumeIndex = 2;  // '교재레벨-호' 열 (C열)
        const lessonNameIndex = 3;  // '차시명' 열 (D열)
        const thumbnailIndex = 4;  // 'thumbnail_url' 열 (E열)
        const ctElementIndex = 6;  // '차시CT요소' 열 (G열)
        const evalItemIndex = 7;  // '평가항목' 열 (H열)
        
        // 구글 시트 데이터에서 해당 카테고리/볼륨 필터링
        let targetCategory = '';
        
        // 카테고리 매핑
        if (category.toLowerCase() === 'preschool') {
            targetCategory = '프리스쿨 LV';
        } else if (category.toLowerCase() === 'junior') {
            targetCategory = '주니어 LV';
        } else if (category.toLowerCase() === 'cps') {
            targetCategory = 'CPS';
        } else if (category.toLowerCase() === 'cpa') {
            targetCategory = 'CPA';
        } else if (category.toLowerCase() === 'ctr_appinventor') {
            targetCategory = '앱인벤터';
        } else if (category.toLowerCase() === 'ctr_python') {
            targetCategory = '파이썬';
        } else {
            targetCategory = category;
        }
        
        console.log(`목표 검색: 카테고리="${targetCategory}", 볼륨="${volume}"`);
        
        // 필터링 - 정확한 호수 패턴 매칭으로 변경
        const filteredRows = sheetData.slice(1).filter(row => {
            if (!row || row.length <= Math.max(categoryIndex, volumeIndex)) {
                return false;
            }
            
            const rowCategory = row[categoryIndex] || '';
            const rowVolume = row[volumeIndex] || '';
            
            // 카테고리 매칭
            const categoryMatch = rowCategory.includes(targetCategory);
            
            // 볼륨 패턴 매칭 - 정확히 해당 호수만 추출
            let volumeMatch = false;
            
            if (categoryMatch && rowVolume) {
                // 볼륨 문자열에서 정확한 호수 패턴 찾기
                // 예: "CPScps1-1" -> 교재번호-호수 패턴에서 호수만 추출
                // 문제: "CPScps1-1"과 "CPScps1-11"이 모두 매칭되는 문제 해결
                
                // 개선된 정규식: 교재번호는 무시하고 "-숫자" 패턴을 찾되,
                // 숫자 뒤에 다른 숫자가 오지 않는 경우만 매칭
                const volumeRegex = new RegExp(`-(${volume})(?!\\d)`);
                const match = rowVolume.match(volumeRegex);
                
                if (match) {
                    console.log(`정확한 호수 매칭: ${rowVolume} -> 호수=${match[1]}`);
                    volumeMatch = true;
                }
            }
            
            return categoryMatch && volumeMatch;
        });
        
        console.log(`필터링 결과: ${filteredRows.length}개 행 일치`);
        
        // 첫 번째 일치 항목 로깅
        if (filteredRows.length > 0) {
            console.log('첫 번째 일치 항목:', filteredRows[0]);
        }
        
        if (filteredRows.length === 0) {
            return res.status(404).json({ error: '해당 교재의 CT요소 정보를 찾을 수 없습니다.' });
        }
        
        // 썸네일 URL 가져오기
        let thumbnailUrl = '';
        if (filteredRows.length > 0 && thumbnailIndex < filteredRows[0].length) {
            thumbnailUrl = filteredRows[0][thumbnailIndex] || '';
        }
        
        // 평가 항목 추출
        const evaluationItems = [];
        const processedItems = new Set();
        
        filteredRows.forEach(row => {
            if (row.length > Math.max(ctElementIndex, evalItemIndex)) {
                const ctElement = row[ctElementIndex];
                const evalItem = row[evalItemIndex];
                
                if (ctElement && evalItem) {
                    const itemKey = `${ctElement}-${evalItem}`;
                    
                    if (!processedItems.has(itemKey)) {
                        processedItems.add(itemKey);
                        evaluationItems.push({
                            id: evaluationItems.length + 1,
                            principle: ctElement,
                            description: evalItem
                        });
                        console.log(`평가항목 추가: ${ctElement} - ${evalItem}`);
                    }
                }
            }
        });
        
        console.log(`평가 항목 추출: ${evaluationItems.length}개`);
        
        // 응답 데이터
        const responseData = {
            book: {
                category: category,
                volume: volume,
                title: `${category} ${volume}호`,
                thumbnail: thumbnailUrl
            },
            evaluationItems: evaluationItems
        };
        
        console.log('응답 데이터 준비 완료');
        res.json(responseData);
    } catch (error) {
        console.error('에러 발생:', error);
        res.status(500).json({ error: '교재 정보를 불러오는 중 오류가 발생했습니다.' });
    }
});

// 웹 페이지: 학습 리포트 생성 페이지
router.get('/generate/:category/:volume', authenticateUser, (req, res) => {
    res.render('report/report_generate', { // 파일명을 report_generate.ejs에 맞게 수정
        userID: req.session?.userID || null,
        is_logined: req.session?.is_logined || false,
        role: req.session?.role || 'guest',
        category: req.params.category,
        volume: req.params.volume
    });
});

module.exports = router;