const express = require('express');
const { google } = require('googleapis');
const db = require('./db');
const router = express.Router();

// 센터 목록 API (Google Sheets에서 가져오기)
router.get('/api/get-center-list', async (req, res) => {
  try {
    const data = await getSheetData('센터목록!A2:B100');
    const centers = data.map(row => ({ id: row[0], name: row[1] }));
    res.json({ centers });
  } catch (error) {
    console.error('센터 목록을 불러오는 중 오류:', error);
    res.status(500).json({ error: '센터 목록을 불러오는 중 오류가 발생했습니다.' });
  }
});

module.exports = router;
