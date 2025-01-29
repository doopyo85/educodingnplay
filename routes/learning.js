const express = require('express');
const router = express.Router();
const { queryDatabase } = require('../lib_login/db');
const { checkRole } = require('../lib_login/authMiddleware');
const { getSheetData } = require('../server'); // 구글시트 데이터 가져오는 함수

// 📌 학습 로드맵 API (센터장 및 관리자만 접근 가능)
router.get('/roadmap', checkRole(['manager', 'admin']), async (req, res) => {
    try {
        // 🔹 Step 1: 구글시트에서 센터 데이터 가져오기
        const centerData = await getSheetData('센터목록!A2:B'); // 예: A열 = centerID, B열 = center_name
        const centerMap = new Map(centerData.map(row => [row[0].toString(), row[1]]));

        // 🔹 Step 2: 학습 활동 데이터 가져오기
        const query = `
            SELECT 
                u.name AS student_name,
                lr.platform,
                ll.content_name,
                ll.start_time,
                ll.end_time,
                ll.duration,
                ll.progress,
                u.centerID
            FROM LearningLogs ll
            JOIN Users u ON ll.user_id = u.id
            LEFT JOIN LearningRecords lr ON ll.user_id = lr.user_id
            ORDER BY ll.start_time DESC;
        `;

        const roadmapData = await queryDatabase(query);

        // 🔹 Step 3: centerID → center_name 변환
        const roadmapWithCenters = roadmapData.map(record => ({
            ...record,
            center_name: centerMap.get(record.centerID?.toString()) || '미지정' // centerID 기반으로 센터명 매핑
        }));

        res.json({
            success: true,
            data: roadmapWithCenters
        });
    } catch (error) {
        console.error('Error fetching learning roadmap:', error);
        res.status(500).json({ success: false, error: '로드맵 데이터를 불러오는데 실패했습니다.' });
    }
});

module.exports = router;
