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
        
        // books 시트에서 교재 정보 가져오기
        const booksData = await getSheetData('books!A1:F1000');
        
        if (!booksData || !Array.isArray(booksData) || booksData.length === 0) {
            console.error('Failed to fetch books data: Empty or invalid response');
            return false;
        }
        
        // report 시트에서 CT요소 정보 가져오기
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
        
        // 캐시 저장 및 타임스탬프 업데이트
        booksDataCache = parsedBooksData;
        reportDataCache = parsedReportData;
        lastCacheUpdate = Date.now();
        console.log(`Books and report data cache updated successfully`);
        return true;
    } catch (error) {
        console.error('Error updating caches:', error);
        return false;
    }
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

// 웹 페이지: 교재 목록 페이지 (간소화된 테이블 뷰)
router.get('/books-page', authenticateUser, (req, res) => {
    console.log('books-page 라우트 처리');
    res.render('report/report_bookslist', { 
        userID: req.session?.userID || null,
        is_logined: req.session?.is_logined || false,
        role: req.session?.role || 'guest'
    });
});

// API 엔드포인트: 교재 카테고리 및 목록 가져오기 (필요한 경우 유지)
router.get('/books', authenticateUser, async (req, res) => {
    try {
        if (!booksDataCache || !lastCacheUpdate || (Date.now() - lastCacheUpdate) > CACHE_TTL) {
            await updateCaches();
        }
        
        // 카테고리별로 그룹화
        const groupedBooks = {};
        
        booksDataCache.forEach(book => {
            const category = book['교재카테고리'] || '기타';
            
            if (!groupedBooks[category]) {
                groupedBooks[category] = [];
            }
            
            groupedBooks[category].push({
                volume: book['교재레벨-호'] || '',
                title: book['교재제목'] || '',
                thumbnail: book['URL'] || ''
            });
        });
        
        res.json(groupedBooks);
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
        
        // 캐시 확인 및 업데이트
        if (!booksDataCache || !reportDataCache || !lastCacheUpdate || (Date.now() - lastCacheUpdate) > CACHE_TTL) {
            await updateCaches();
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
        
        console.log(`목표 검색: 카테고리="${targetCategory}", 볼륨="${volume}"`);
        
        // 교재 정보 찾기
        const bookInfo = booksDataCache.find(book => {
            const bookCategory = book['교재카테고리'] || '';
            const bookVolume = book['교재레벨-호'] || '';
            
            // 카테고리 매칭
            const categoryMatch = bookCategory.includes(targetCategory);
            
            // 볼륨 매칭 (다양한 패턴 지원)
            let volumeMatch = false;
            
            if (bookVolume === volume) {
                volumeMatch = true;
            } else if (bookVolume.includes(`-${volume}`)) {
                volumeMatch = true;
            } else {
                // 숫자 추출 시도
                const numbers = bookVolume.match(/\d+/g);
                if (numbers && numbers.includes(volume.replace(/호$/, ''))) {
                    volumeMatch = true;
                }
            }
            
            return categoryMatch && volumeMatch;
        });
        
        // 기본 교재 정보 설정
        const bookData = {
            category: category,
            volume: volume,
            title: `${targetCategory} ${volume}`,
            thumbnail: ''
        };
        
        // 교재 정보가 있으면 업데이트
        if (bookInfo) {
            bookData.title = bookInfo['교재제목'] || bookData.title;
            bookData.thumbnail = bookInfo['URL'] || '';
            console.log(`교재 정보 찾음: ${bookData.title}`);
        } else {
            console.log(`교재 정보를 찾을 수 없음. 기본값 사용: ${bookData.title}`);
        }
        
        // CT요소 및 평가 항목 필터링
        const filteredReportData = reportDataCache.filter(item => {
            const itemCategory = item['교재카테고리'] || '';
            const itemVolume = item['교재레벨-호'] || '';
            
            // 카테고리 매칭
            const categoryMatch = itemCategory.includes(targetCategory);
            
            // 볼륨 매칭 (다양한 패턴 지원)
            let volumeMatch = false;
            
            if (itemVolume === volume) {
                volumeMatch = true;
            } else if (itemVolume.includes(`-${volume}`)) {
                volumeMatch = true;
            } else {
                // 숫자 추출 시도
                const numbers = itemVolume.match(/\d+/g);
                if (numbers && numbers.includes(volume.replace(/호$/, ''))) {
                    volumeMatch = true;
                }
            }
            
            return categoryMatch && volumeMatch;
        });
        
        console.log(`필터링된 CT요소 데이터: ${filteredReportData.length}개 행`);
        
        // 평가 항목 추출
        const evaluationItems = [];
        const processedItems = new Set();
        
        filteredReportData.forEach((item, index) => {
            const chapter = item['차시'] || '';
            const chapterName = item['차시명'] || '';
            const ctElement = item['CT요소'] || '';
            const evalItem = item['평가항목'] || '';
            
            if (ctElement && evalItem) {
                const itemKey = `${ctElement}-${evalItem}`;
                
                if (!processedItems.has(itemKey)) {
                    processedItems.add(itemKey);
                    evaluationItems.push({
                        id: index + 1,
                        chapter: chapter,
                        chapterName: chapterName,
                        principle: ctElement,
                        description: evalItem
                    });
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

// HTML 웹 페이지: 학습 리포트 생성 페이지
router.get('/generate/:category/:volume', authenticateUser, (req, res) => {
    res.render('report/report_generate', {
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
        
        // 캐시 확인 및 업데이트
        if (!reportDataCache || !lastCacheUpdate || (Date.now() - lastCacheUpdate) > CACHE_TTL) {
            await updateCaches();
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
        
        // 해당 교재의 CT요소만 필터링
        const filteredElements = reportDataCache.filter(item => {
            const itemCategory = item['교재카테고리'] || '';
            const itemVolume = item['교재레벨-호'] || '';
            
            // 카테고리 매칭
            const categoryMatch = itemCategory.includes(targetCategory);
            
            // 볼륨 매칭
            let volumeMatch = false;
            
            if (itemVolume === volume) {
                volumeMatch = true;
            } else if (itemVolume.includes(`-${volume}`)) {
                volumeMatch = true;
            } else {
                // 숫자 추출 시도
                const numbers = itemVolume.match(/\d+/g);
                if (numbers && numbers.includes(volume.replace(/호$/, ''))) {
                    volumeMatch = true;
                }
            }
            
            return categoryMatch && volumeMatch;
        });
        
        // 결과 포맷팅
        const ctElements = filteredElements.map(item => ({
            차시: item['차시'] || '',
            차시명: item['차시명'] || '',
            CT요소: item['CT요소'] || '',
            평가항목: item['평가항목'] || ''
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