const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080;

// 정적 파일 제공
app.use(express.static(path.join(__dirname, '../public')));

// 모든 요청에 대해 Entry 에디터 제공
app.get('*', (req, res) => {
  const projectFile = req.query.project_file || '';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Entry Editor</title>
    <link href="/js/entry/entry.css" rel="stylesheet" />
    <link href="/js/entry/entry-tool.css" rel="stylesheet" />
    
    <script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jqueryui/1.12.1/jquery-ui.min.js"></script>
    <script src="https://code.createjs.com/1.0.0/preloadjs.min.js"></script>
    <script src="https://code.createjs.com/1.0.0/easeljs.min.js"></script>
    <script src="https://code.createjs.com/1.0.0/soundjs.min.js"></script>
    <script src="https://unpkg.com/react@18/umd/react.production.min.js"></script>
    <script src="https://unpkg.com/react-dom@18/umd/react-dom.production.min.js"></script>
    
    <style>
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
        #entryContainer { width: 100%; height: 100%; }
    </style>
</head>
<body>
    <div id="entryContainer"></div>
    
    <!-- 네임스페이스 초기화 -->
    <script>
        window.EntryTool = {};
        window.EntryVideoLegacy = {};
        window.EntryPaint = {};
        window.EntrySoundEditor = {};
    </script>
    
    <!-- entry-tool.js 먼저 로드 -->
    <script src="/js/entry/entry-tool.js"></script>
    
    <!-- 그 다음 entry.js 로드 -->
    <script src="/js/entry/entry.js"></script>
    
    <script>
        // 디버깅을 위한 로그 기록
        console.log("Entry 초기화 시작");
        
        $(document).ready(function() {
            setTimeout(function() {
                try {
                    const projectFile = "${projectFile}";
                    console.log("Entry 객체 유형:", typeof Entry);
                    
                    if (typeof Entry === 'undefined') {
                        document.getElementById('entryContainer').innerHTML = "<h2>Entry 라이브러리를 불러올 수 없습니다.</h2>";
                        return;
                    }
                    
                    // Entry 객체가 있으면 초기화 시도
                    Entry.init({
                        type: 'workspace',
                        container: 'entryContainer',
                        loadProject: false
                    });
                    
                    // 프로젝트 파일 로드
                    if (projectFile) {
                        fetch(projectFile)
                            .then(response => response.json())
                            .then(data => {
                                Entry.loadProject(data);
                                Entry.playground.changeViewMode('code');
                                Entry.start();
                            })
                            .catch(error => {
                                console.error("프로젝트 로드 실패:", error);
                                Entry.loadProject();
                                Entry.start();
                            });
                    } else {
                        Entry.loadProject();
                        Entry.start();
                    }
                    
                    console.log("Entry 초기화 완료");
                } catch (error) {
                    console.error("Entry 초기화 오류:", error);
                    document.getElementById('entryContainer').innerHTML = "<h2>Entry 초기화 중 오류 발생</h2><p>" + error.message + "</p>";
                }
            }, 500); // 약간의 지연으로 모든 리소스가 로드될 시간을 줌
        });
    </script>
</body>
</html>`;
  
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`Entry 서버가 http://localhost:${PORT} 에서 실행 중입니다`);
});