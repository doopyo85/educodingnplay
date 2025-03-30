// 월간 학습 리포트 POD 기능을 위한 라우터
const express = require('express');
const router = express.Router();
const { getSheetData } = require('../server'); // server.js에서 내보낸 함수 사용
const { authenticateUser } = require('../lib_login/authMiddleware');

// 캐시 저장소
let booksDataCache = null;
let reportDataCache = null;
let lastCacheUpdate = null;
const CACHE_TTL = 24 * 60 * 60 * 1000; // 24시간(1일) 캐시 유효기간

// 캐시 업데이트 함수
async function updateCaches() {
    try {
        console.log('Updating books and report data cache from Google Sheets...');
        
        // 1. books 시트에서 교재 정보 가져오기
        const booksData = await getSheetData('books!A1:F1000');
        
        if (!booksData || !Array.isArray(booksData) || booksData.length === 0) {
            console.error('Failed to fetch books data: Empty or invalid response');
            return false;
        }
        
        // 2. report 시트에서 CT요소 정보 가져오기
        const reportData = await getSheetData('report!A1:G1000');
        
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
            console.error('Failed to fetch report data: Empty or invalid response');
            return false;
        }
        
        // 헤더 행 추출
        const booksHeaders = booksData[0];
        const reportHeaders = reportData[0];
        
        // 데이터 객체로 변환 (헤더를 키로 사용)
        const parsedBooksData = booksData.slice(1).map(row => {
            const item = {};
            booksHeaders.forEach((header, index) => {
                item[header] = row[index] || '';
            });
            return item;
        });
        
        const parsedReportData = reportData.slice(1).map(row => {
            const item = {};
            reportHeaders.forEach((header, index) => {
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
        const categorizedBooks = {};
        
        // 먼저 고정된 교재 카테고리 생성
        Object.keys(fixedBooks).forEach(category => {
            categorizedBooks[category] = [];
            // 각 카테고리별 호수 생성
            for (let i = 1; i <= fixedBooks[category]; i++) {
                categorizedBooks[category].push({
                    category: category,
                    volume: i.toString(),
                    title: `${category} ${i}호`,
                    thumbnail_url: ''
                });
            }
        });
        
        // books 시트 데이터로 추가 정보 업데이트 (썸네일 URL 등)
        parsedBooksData.forEach(item => {
            // 시트의 컬럼명을 확인
            const category = item['교재카테고리'] || '기타';
            const volume = item['교재레벨-호'] || '';
            const title = item['교재제목'] || '';
            const thumbnail = item['URL'] || '';
            
            // 해당 카테고리가 없는 경우 새로 생성
            if (!categorizedBooks[category]) {
                categorizedBooks[category] = [];
            }
            
            // 기존 항목 찾기
            const existingVolumeIndex = categorizedBooks[category].findIndex(book => 
                book.volume === volume
            );
            
            if (existingVolumeIndex >= 0) {
                // 기존 항목 업데이트
                categorizedBooks[category][existingVolumeIndex].title = title;
                categorizedBooks[category][existingVolumeIndex].thumbnail_url = thumbnail;
            } else {
                // 새 항목 추가
                categorizedBooks[category].push({
                    category: category,
                    volume: volume,
                    title: title,
                    thumbnail_url: thumbnail
                });
            }
        });
        
        // 캐시 저장 및 타임스탬프 업데이트
        booksDataCache = categorizedBooks;
        reportDataCache = parsedReportData;
        lastCacheUpdate = Date.now();
        console.log(`Books and report data cache updated successfully`);
        return true;
    } catch (error) {
        console.error('Error updating caches:', error);
        return false;
    }
}

// 캐시된 데이터 가져오기
async function getBooksData() {
    // 캐시가 없거나 만료된 경우 업데이트
    if (!booksDataCache || !lastCacheUpdate || (Date.now() - lastCacheUpdate) > CACHE_TTL) {
        const success = await updateCaches();
        if (!success && !booksDataCache) {
            throw new Error('Failed to initialize books data cache');
        }
    }
    
    return booksDataCache;
}

async function getReportElements() {
    // 캐시가 없거나 만료된 경우 업데이트
    if (!reportDataCache || !lastCacheUpdate || (Date.now() - lastCacheUpdate) > CACHE_TTL) {
        const success = await updateCaches();
        if (!success && !reportDataCache) {
            throw new Error('Failed to initialize report data cache');
        }
    }
    
    return reportDataCache;
}

// 서버 시작 시 캐시 초기화
updateCaches().catch(err => {
    console.error('Initial cache update failed:', err);
});

// 일별 새벽 4시에 캐시 자동 갱신
setInterval(async () => {
    const now = new Date();
    if (now.getHours() === 4 && now.getMinutes() === 0) {
        console.log('Scheduled cache update...');
        await updateCaches();
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
        const booksData = await getBooksData();
        res.json(booksData);
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
        
        // 교재 정보 가져오기 (books 시트)
        const booksData = await getSheetData('books!A2:F1000');
        console.log(`교재 데이터 수신: ${booksData ? booksData.length : 0}행`);
        
        // CT요소 정보 가져오기 (report 시트)
        const reportData = await getSheetData('report!A2:G1000');
        console.log(`CT요소 데이터 수신: ${reportData ? reportData.length : 0}행`);
        
        if (!booksData || !Array.isArray(booksData) || booksData.length === 0) {
            console.error('교재 데이터가 없거나 불충분합니다');
            return res.status(404).json({ error: '교재 데이터를 찾을 수 없습니다.' });
        }
        
        if (!reportData || !Array.isArray(reportData) || reportData.length === 0) {
            console.error('CT요소 데이터가 없거나 불충분합니다');
            return res.status(404).json({ error: 'CT요소 데이터를 찾을 수 없습니다.' });
        }
        
        // 인덱스 설정 - books 시트
        const bookNoIndex = 0;         // 'NO' 열 (A열)
        const bookCategoryIndex = 1;   // '교재카테고리' 열 (B열)
        const bookVolumeIndex = 2;     // '교재레벨-호' 열 (C열)
        const bookTitleIndex = 3;      // '교재제목' 열 (D열)
        const bookDescIndex = 4;       // '교재요약' 열 (E열)
        const bookThumbnailIndex = 5;  // 'URL' 열 (F열)
        
        // 인덱스 설정 - report 시트
        const reportNoIndex = 0;         // 'NO' 열 (A열)
        const reportCategoryIndex = 1;   // '교재카테고리' 열 (B열)
        const reportVolumeIndex = 2;     // '교재레벨-호' 열 (C열)
        const reportChapterIndex = 3;    // '차시' 열 (D열)
        const reportChapterNameIndex = 4;// '차시명' 열 (E열)
        const reportCTElementIndex = 5;  // 'CT요소' 열 (F열)
        const reportEvalItemIndex = 6;   // '평가항목' 열 (G열)
        
        // 카테고리 매핑
        let targetCategory = '';
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
        
        // 교재 정보 찾기
        const bookInfo = booksData.find(row => {
            if (!row || row.length <= Math.max(bookCategoryIndex, bookVolumeIndex)) {
                return false;
            }
            
            const rowCategory = row[bookCategoryIndex] || '';
            const rowVolume = row[bookVolumeIndex] || '';
            
            // 카테고리 매칭
            const categoryMatch = rowCategory.includes(targetCategory);
            
            // 볼륨 매칭 (다양한 패턴 지원)
            let volumeMatch = false;
            
            if (rowVolume === volume) {
                volumeMatch = true;
            } else if (rowVolume.includes(`-${volume}`)) {
                volumeMatch = true;
            } else {
                // 숫자 추출 시도
                const numbers = rowVolume.match(/\d+/g);
                if (numbers && numbers.includes(volume)) {
                    volumeMatch = true;
                }
            }
            
            return categoryMatch && volumeMatch;
        });
        
        // 기본 교재 정보 설정
        const bookData = {
            category: category,
            volume: volume,
            title: `${targetCategory} ${volume}호`,
            thumbnail: ''
        };
        
        // 교재 정보가 있으면 업데이트
        if (bookInfo) {
            bookData.title = bookInfo[bookTitleIndex] || bookData.title;
            bookData.thumbnail = bookInfo[bookThumbnailIndex] || '';
            console.log(`교재 정보 찾음: ${bookData.title}`);
        } else {
            console.log(`교재 정보를 찾을 수 없음. 기본값 사용: ${bookData.title}`);
        }
        
        // CT요소 및 평가 항목 필터링
        const filteredReportData = reportData.filter(row => {
            if (!row || row.length <= Math.max(reportCategoryIndex, reportVolumeIndex)) {
                return false;
            }
            
            const rowCategory = row[reportCategoryIndex] || '';
            const rowVolume = row[reportVolumeIndex] || '';
            
            // 카테고리 매칭
            const categoryMatch = rowCategory.includes(targetCategory);
            
            // 볼륨 매칭 (다양한 패턴 지원)
            let volumeMatch = false;
            
            if (rowVolume === volume) {
                volumeMatch = true;
            } else if (rowVolume.includes(`-${volume}`)) {
                volumeMatch = true;
            } else {
                // 숫자 추출 시도
                const numbers = rowVolume.match(/\d+/g);
                if (numbers && numbers.includes(volume)) {
                    volumeMatch = true;
                }
            }
            
            return categoryMatch && volumeMatch;
        });
        
        console.log(`필터링된 CT요소 데이터: ${filteredReportData.length}개 행`);
        
        // 평가 항목 추출
        const evaluationItems = [];
        const processedItems = new Set();
        
        filteredReportData.forEach(row => {
            if (row.length > Math.max(reportCTElementIndex, reportEvalItemIndex)) {
                const chapter = row[reportChapterIndex] || '';
                const chapterName = row[reportChapterNameIndex] || '';
                const ctElement = row[reportCTElementIndex] || '';
                const evalItem = row[reportEvalItemIndex] || '';
                
                if (ctElement && evalItem) {
                    const itemKey = `${ctElement}-${evalItem}`;
                    
                    if (!processedItems.has(itemKey)) {
                        processedItems.add(itemKey);
                        evaluationItems.push({
                            id: evaluationItems.length + 1,
                            chapter: chapter,
                            chapterName: chapterName,
                            principle: ctElement,
                            description: evalItem
                        });
                        console.log(`평가항목 추가: 차시=${chapter}, CT요소=${ctElement}`);
                    }
                }
            }
        });
        
        // 차시 순으로 정렬
        evaluationItems.sort((a, b) => {
            const chapterA = parseInt(a.chapter) || 0;
            const chapterB = parseInt(b.chapter) || 0;
            return chapterA - chapterB;
        });
        
        console.log(`평가 항목 추출: ${evaluationItems.length}개`);
        
        // 응답 데이터
        const responseData = {
            book: bookData,
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

// CT요소 API - 특정 교재의 CT요소만 가져오기
router.get('/book-ct-elements/:category/:volume', authenticateUser, async (req, res) => {
    try {
        const { category, volume } = req.params;
        
        // report 시트에서 CT요소 정보 가져오기
        const reportData = await getSheetData('report!A2:G1000');
        
        if (!reportData || !Array.isArray(reportData)) {
            return res.status(404).json({ error: 'CT요소 데이터를 찾을 수 없습니다.' });
        }
        
        // 카테고리 매핑
        let targetCategory = '';
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
        
        // 인덱스 설정
        const categoryIndex = 1;   // '교재카테고리' 열 (B열)
        const volumeIndex = 2;     // '교재레벨-호' 열 (C열)
        const chapterIndex = 3;    // '차시' 열 (D열)
        const chapterNameIndex = 4;// '차시명' 열 (E열)
        const ctElementIndex = 5;  // 'CT요소' 열 (F열)
        const evalItemIndex = 6;   // '평가항목' 열 (G열)
        
        // 해당 교재의 CT요소만 필터링
        const filteredElements = reportData.filter(row => {
            if (!row || row.length <= Math.max(categoryIndex, volumeIndex)) {
                return false;
            }
            
            const rowCategory = row[categoryIndex] || '';
            const rowVolume = row[volumeIndex] || '';
            
            // 카테고리 매칭
            const categoryMatch = rowCategory.includes(targetCategory);
            
            // 볼륨 매칭
            let volumeMatch = false;
            
            if (rowVolume === volume) {
                volumeMatch = true;
            } else if (rowVolume.includes(`-${volume}`)) {
                volumeMatch = true;
            } else {
                // 숫자 추출 시도
                const numbers = rowVolume.match(/\d+/g);
                if (numbers && numbers.includes(volume)) {
                    volumeMatch = true;
                }
            }
            
            return categoryMatch && volumeMatch;
        });
        
        // 결과 포맷팅
        const ctElements = filteredElements.map(row => ({
            차시: row[chapterIndex] || '',
            차시명: row[chapterNameIndex] || '',
            CT요소: row[ctElementIndex] || '',
            평가항목: row[evalItemIndex] || ''
        }));
        
        // 차시 순으로 정렬
        ctElements.sort((a, b) => {
            const chapterA = parseInt(a.차시) || 0;
            const chapterB = parseInt(b.차시) || 0;
            return chapterA - chapterB;
        });
        
        res.json(ctElements);
    } catch (error) {
        console.error('CT요소 데이터 로딩 중 오류:', error);
        res.status(500).json({ error: 'CT요소 데이터를 불러오는 중 오류가 발생했습니다.' });
    }
});

module.exports = router;