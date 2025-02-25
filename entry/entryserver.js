// entryserver.js
const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080;

// 정적 파일 제공
app.use(express.static(path.join(__dirname, '../public')));

// 최소한의 HTML 페이지 제공
app.get('/', (req, res) => {
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Entry Editor</title>
    <link href="/js/entry/entry.css" rel="stylesheet" />
    
    <!-- 의존성 -->
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
    
    <!-- EntryTool 등의 네임스페이스 정의 -->
    <script>
        window.EntryTool = {};
        window.EntryVideoLegacy = {};
        window.EntryPaint = {};
        window.EntrySoundEditor = {};
    </script>
    
    <!-- EntryJS -->
    <script src="/js/entry/entry-tool.js"></script>
    <script src="/js/entry/entry.js"></script>
    
    <script>
        // 프로젝트 파일 URL (선택적)
        const projectFile = "${req.query.project_file || ''}";
        
        // 간단하게 로딩 시도
        $(document).ready(function() {
            try {
                console.log("Entry 로딩 시도");
                
                // 일반적인 초기화 방식 시도
                if (typeof Entry === 'object' && Entry.init) {
                    Entry.init({
                        container: 'entryCanvas',
                        type: 'workspace'
                    });
                    
                    // 프로젝트 파일이 있으면 로드
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
                    console.error("Entry 객체를 찾을 수 없거나 초기화할 수 없습니다");
                }
            } catch (e) {
                console.error("Entry 초기화 오류", e);
            }
        });
    </script>
</body>
</html>
  `;
  
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`Entry server running at http://localhost:${PORT}`);
});