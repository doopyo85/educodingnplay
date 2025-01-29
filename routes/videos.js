const express = require('express');
const { google } = require('googleapis');
const router = express.Router();
require('dotenv').config();

const SHEET_ID = process.env.SPREADSHEET_ID; // .env에서 시트 ID 불러오기
const RANGE = 'vod!A2:H100'; // 강의 목록 데이터 범위

async function fetchVideos() {
    const auth = new google.auth.GoogleAuth({
        keyFile: 'google-service-account.json',
        scopes: ['https://www.googleapis.com/auth/spreadsheets.readonly'],
    });

    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: SHEET_ID,
        range: RANGE,
    });

    const rows = response.data.values;
    if (!rows || rows.length === 0) {
        return [];
    }

    return rows.map(row => ({
        category: row[0] || '기타',  // 수업 카테고리 (예: 프리스쿨 OT, 강사교육 등)
        session: row[1] || '',       // 차시명
        title: row[2] || '',         // 강의 제목
        activity: row[3] || '',      // 활동명
        instructor: row[4] || '',    // 강의자
        duration: row[5] || '',      // 재생시간
        url: row[6] || '',           // YouTube URL
        thumbnail: row[7] || ''      // 썸네일 이미지
    }));
}

router.get('/videos', async (req, res) => {
    try {
        const videos = await fetchVideos();
        res.json(videos);
    } catch (error) {
        console.error('Google Sheets API 오류:', error);
        res.status(500).json({ error: '데이터를 불러오는 중 오류 발생' });
    }
});

module.exports = router;
