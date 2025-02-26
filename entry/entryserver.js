cat > /var/www/html/entry/entryserver.js << 'EOL'
const express = require('express');
const path = require('path');
const app = express();
const PORT = 8080;

app.use(express.static(path.join(__dirname, '../public')));

app.get('*', (req, res) => {
  const projectFile = req.query.project_file || '';
  
  const html = `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <title>Entry Editor</title>
    
    <!-- 의존성 -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js"></script>
    <script src="https://code.createjs.com/1.0.0/preloadjs.min.js"></script>
    <script src="https://code.createjs.com/1.0.0/easeljs.min.js"></script>
    <script src="https://code.createjs.com/1.0.0/soundjs.min.js"></script>
    
    <!-- Entry CSS -->
    <link href="/js/entry/entry.css" rel="stylesheet" />
    
    <style>
        html, body { 
            margin: 0; 
            padding: 0; 
            width: 100%; 
            height: 100%; 
        }
        #entryContainer { 
            width: 100%; 
            height: 100%; 
        }
    </style>
</head>
<body>
    <div id="entryContainer"></div>
    
    <!-- 필수 네임스페이스 정의 -->
    <script>
        // 필수 네임스페이스 정의
        window.EntryTool = {};
        window.EntrySoundEditor = {};
        window.EntryPaint = {};
        window.EntryVideoLegacy = {};
        
        // Lang 객체 정의
        window.Lang = {
            Blocks: {},
            Workspace: {},
            Menus: {},
            General: {},
            template: {},
            Buttons: {},
            Messages: {},
            DataAnalytics: {}
        };
    </script>
    
    <!-- Entry 스크립트 -->
    <script src="/js/entry/entry.js"></script>
    
    <!-- 초기화 스크립트 -->
    <script>
        $(document).ready(function() {
            setTimeout(function() {
                try {
                    // Entry 객체가 있는지 확인
                    if (typeof Entry === 'undefined') {
                        document.getElementById('entryContainer').innerHTML = 
                            '<h2>Entry를 불러올 수 없습니다</h2>';
                        return;
                    }
                    
                    console.log("Entry 초기화 시도");
                    
                    // Entry 객체 확인
                    console.log("Entry 타입:", typeof Entry);
                    console.log("Entry 구조:", Object.keys(Entry).join(", "));
                    
                    // Entry.getMainWS가 있는지 확인
                    if (typeof Entry.getMainWS === 'function') {
                        console.log("Entry.getMainWS 사용");
                        
                        // 작업공간 가져오기
                        var workspace = Entry.getMainWS();
                        
                        if (workspace) {
                            // 작업공간이 있으면 시작
                            workspace.loadProject();
                            workspace.start();
                        } else {
                            // 작업공간이 없으면 생성 시도
                            Entry.loadProject();
                            Entry.start();
                        }
                    } else {
                        // 다른 Entry 메서드 시도
                        console.log("Entry.getMainWS 없음");
                        
                        // Entry에 대체 메서드 있는지 확인
                        var alternativeMethods = [
                            'loadProject', 'start', 'init'
                        ];
                        
                        alternativeMethods.forEach(function(method) {
                            console.log("Entry." + method + " 존재? " + 
                                (typeof Entry[method] === 'function'));
                        });
                        
                        // 로드 시도
                        Entry.loadProject();
                        Entry.start();
                    }
                    
                    console.log("Entry 초기화 시도 완료");
                } catch (error) {
                    console.error("Entry 초기화 오류:", error);
                    document.getElementById('entryContainer').innerHTML = 
                        '<h2>Entry 초기화 오류</h2><p>' + error.message + '</p>';
                }
            }, 1000);
        });
    </script>
</body>
</html>`;
  
  res.send(html);
});

app.listen(PORT, () => {
  console.log('Entry 서버가 http://localhost:' + PORT + ' 에서 실행 중입니다');
});
EOL