const express = require('express');
const db = require('../lib_login/db');
const { google } = require('googleapis');
const router = express.Router();

// 센터 목록 가져오기 (Google Sheets API)
const getCenterListFromSheet = async (spreadsheetId, apiKey) => {
  const sheets = google.sheets({ version: 'v4', auth: apiKey });
  try {
    const response = await sheets.spreadsheets.values.get({
      spreadsheetId: spreadsheetId,
      range: '센터목록!A:B',
    });
    const rows = response.data.values;
    if (rows.length) {
      return rows.map(row => ({ id: row[0], name: row[1] }));
    } else {
      console.log('No data found.');
      return [];
    }
  } catch (error) {
    console.error('Error fetching center list:', error);
    throw error;
  }
};

// 센터 목록 API
router.get('/api/get-center-list', async (req, res) => {
  try {
    const centers = await getCenterListFromSheet(process.env.SPREADSHEET_ID, process.env.GOOGLE_API_KEY);
    res.json({ centers });
  } catch (error) {
    res.status(500).json({ error: '센터 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

// 센터 목록 DB에서 가져오기
router.get('/list', (req, res) => {
  db.query('SELECT * FROM centers', (err, results) => {
    if (err) throw err;
    res.json(results);
  });
});

module.exports = router;
