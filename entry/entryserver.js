const express = require('express');
const app = express();
const PORT = 8080;

app.get('*', (req, res) => {
  const projectFile = req.query.project_file || '';
  
  // iframe을 사용하여 playentry.org를 직접 임베드
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Entry Editor</title>
    <style>
        html, body { 
            margin: 0; 
            padding: 0; 
            width: 100%; 
            height: 100%; 
            overflow: hidden;
        }
        #entryFrame {
            width: 100%;
            height: 100%;
            border: none;
        }
    </style>
</head>
<body>
    <iframe id="entryFrame" src="${projectFile ? `https://playentry.org/ws#file:${encodeURIComponent(projectFile)}` : 'https://playentry.org/ws'}" allowfullscreen></iframe>
</body>
</html>`;
  
  res.send(html);
});

app.listen(PORT, () => {
  console.log('Entry 서버가 http://localhost:' + PORT + ' 에서 실행 중입니다');
});