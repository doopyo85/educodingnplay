const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080;

// 정적 파일 제공
app.use(express.static(path.join(__dirname, '../public')));

// 모든 요청에 CORS 헤더 추가
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// 모든 경로에 대해 Entry 에디터 제공
app.get('*', (req, res) => {
  const projectFile = req.query.project_file || '';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Entry Editor</title>
    <link href="/js/entry/entry.css" rel="stylesheet" />
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js"></script>
    <script src="https://code.createjs.com/1.0.0/preloadjs.min.js"></script>
    <script src="https://code.createjs.com/1.0.0/easeljs.min.js"></script>
    <script src="https://code.createjs.com/1.0.0/soundjs.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js"></script>
    
    <style>
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
        #entryCanvas { width: 100%; height: 100%; }
    </style>
</head>
<body>
    <div id="entryCanvas"></div>
    
    <script>
        // 기본 네임스페이스 정의
        window.EntryTool = {};
        window.EntryVideoLegacy = {};
        window.EntryPaint = {};
        window.EntrySoundEditor = {};
    </script>
    
    <script src="/js/entry/entry.js"></script>
    
    <script>
        console.log("Entry 초기화 시도");
        console.log("Entry 객체:", typeof Entry);
        
        $(document).ready(function() {
            // 로딩 확인
            if (typeof Entry === 'undefined') {
                document.getElementById('entryCanvas').innerHTML = "Entry 라이브러리를 불러올 수 없습니다.";
                return;
            }
            
            try {
                // 프로젝트 파일
                const projectFile = "${projectFile}";
                
                // Entry 객체 메서드 확인 및 디버깅
                console.log("Entry 메서드:", Object.keys(Entry));
                
                // 간단한 초기화 시도
                if (typeof Entry.getMainWS === 'function') {
                    Entry.init('entryCanvas');
                    
                    if (projectFile) {
                        fetch(projectFile)
                            .then(r => r.json())
                            .then(data => Entry.loadProject(data))
                            .catch(e => console.error("프로젝트 로드 실패", e));
                    } else {
                        Entry.loadProject();
                    }
                    
                    Entry.start();
                    console.log("Entry 초기화 완료");
                } else {
                    document.getElementById('entryCanvas').innerHTML = "Entry 객체를 초기화할 수 없습니다.";
                }
            } catch (e) {
                console.error("Entry 초기화 오류", e);
                document.getElementById('entryCanvas').innerHTML = "Entry 초기화 중 오류 발생: " + e.message;
            }
        });
    </script>
</body>
</html>`;
  
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`Entry 서버가 http://localhost:${PORT} 에서 실행 중입니다`);
});