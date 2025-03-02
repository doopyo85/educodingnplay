const express = require('express');
const app = express();
const PORT = 8080;

app.get('/', (req, res) => {
  const projectFile = req.query.project_file || '';
  
  // Entry 스튜디오 URL 생성
  const entryUrl = projectFile 
    ? `https://playentry.org/ws#file:${encodeURIComponent(projectFile)}`
    : 'https://playentry.org/ws';
  
  // 중간 페이지 제공
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
          font-family: Arial, sans-serif;
        }
        .container {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          height: 100vh;
          text-align: center;
          background-color: #f5f5f5;
        }
        .button {
          display: inline-block;
          padding: 12px 24px;
          background-color: #4CAF50;
          color: white;
          text-decoration: none;
          border-radius: 5px;
          font-size: 18px;
          margin-top: 20px;
          transition: background-color 0.3s;
          border: none;
          cursor: pointer;
        }
        .button:hover {
          background-color: #3e8e41;
        }
        .backButton {
          position: absolute;
          top: 20px;
          left: 20px;
          padding: 8px 16px;
          background-color: #f1f1f1;
          color: #333;
          text-decoration: none;
          border-radius: 4px;
          font-size: 14px;
        }
      </style>
    </head>
    <body>
      <a href="/entry_project" class="backButton">← 프로젝트 목록</a>
      <div class="container">
        <h1>Entry Studio</h1>
        <p>Entry Studio가 새 창에서 열립니다</p>
        <button id="openButton" class="button">Entry Studio 열기</button>
      </div>
      <script>
        document.getElementById('openButton').addEventListener('click', function() {
          window.open('${entryUrl}', '_blank');
        });
        
        // 페이지 로드 후 1초 후에 자동으로 Entry Studio 열기
        setTimeout(function() {
          document.getElementById('openButton').click();
        }, 1000);
      </script>
    </body>
    </html>
  `;
  
  res.send(html);
});

app.listen(PORT, () => {
  console.log('Entry 서버가 http://localhost:' + PORT + ' 에서 실행 중입니다');
});