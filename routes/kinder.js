const express = require('express');
const { google } = require('googleapis');
require('dotenv').config();

const router = express.Router();

async function getSheetData(range) {
    const sheets = google.sheets({ version: 'v4', auth: process.env.GOOGLE_API_KEY });
    const response = await sheets.spreadsheets.values.get({
        spreadsheetId: process.env.SPREADSHEET_ID,
        range: `교사게시판!${range}`,
    });
    return response.data.values;
}

router.get('/', async (req, res) => {
    try {
        const sheetData = await getSheetData('A1:D14');  // 구글 시트 범위
        const headers = sheetData[0];  // 컬럼명
        const data = sheetData.slice(1).map(row => ({
            type: row[0] || '',
            content: row[1] || '',
            links: row[2] ? row[2].split('\n') : [],  // 여러 개의 링크 분할
            url: row[3] || ''
        }));

        res.render('kinder', { headers, data });
    } catch (error) {
        console.error('Error fetching sheet data:', error);
        res.status(500).send('데이터를 불러오는 중 오류 발생');
    }
});

module.exports = router;
