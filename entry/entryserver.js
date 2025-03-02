const express = require('express');
const axios = require('axios');
const cheerio = require('cheerio');
const app = express();
const PORT = 8080;

app.get('/', async (req, res) => {
  const projectFile = req.query.project_file || '';
  
  try {
    // 헤더 설정
    res.setHeader('Content-Type', 'text/html');
    
    // 프레임 내 표시를 방지하는 헤더 제거
    res.removeHeader('X-Frame-Options');
    
    // 프로젝트 파일 매개변수가 있으면 추가
    const targetUrl = projectFile 
      ? `https://playentry.org/ws#file:${encodeURIComponent(projectFile)}`
      : 'https://playentry.org/ws';
    
    // 간단한 래퍼 페이지 제공
    const html = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="UTF-8">
        <title>Entry Studio</title>
        <style>
          body, html {
            margin: 0;
            padding: 0;
            height: 100%;
            overflow: hidden;
          }
          #redirectButton {
            position: fixed;
            top: 10px;
            left: 10px;
            z-index: 1000;
            padding: 10px;
            background: #4CAF50;
            color: white;
            border: none;
            border-radius: 4px;
            cursor: pointer;
          }
        </style>
      </head>
      <body>
        <button id="redirectButton" onclick="window.location.href='/entry_project'">← 프로젝트 목록</button>
        <div style="text-align: center; padding: 20px;">
          <h2>Entry Studio로 이동합니다</h2>
          <p>아래 버튼을 클릭하여 Entry Studio로 이동하세요</p>
          <a href="${targetUrl}" target="_blank" style="display: inline-block; padding: 10px 20px; background-color: #4CAF50; color: white; text-decoration: none; border-radius: 5px;">
            Entry Studio 열기
          </a>
          <p style="margin-top: 20px; color: #666;">
            참고: Entry는 외부 사이트에서 iframe으로 로드될 수 없습니다. <br>
            새 창에서 열어야 합니다.
          </p>
        </div>
      </body>
      </html>
    `;
    
    res.send(html);
  } catch (error) {
    console.error('Error:', error);
    res.status(500).send('Entry Studio를 로드하는 중 오류가 발생했습니다.');
  }
});

app.listen(PORT, () => {
  console.log('Entry 서버가 http://localhost:' + PORT + ' 에서 실행 중입니다');
});