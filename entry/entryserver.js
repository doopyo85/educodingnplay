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
        // Lang 객체 (언어 정의)
        window.Lang = {
            Blocks: {},
            Workspace: {},
            Menus: {},
            General: {},
            Classes: {},
            DataAnalytics: {},
            template: {},
            Buttons: {}
        };
        
        // EntryTool 등 다른 네임스페이스
        window.EntryTool = {};
        window.EntryVideoLegacy = {};
        window.EntryPaint = {};
        window.EntrySoundEditor = {};
    </script>
    
    <!-- 스크립트 로드 -->
    <script src="/js/entry/entry-tool.js"></script>
    <script src="/js/entry/entry.js"></script>
    
    <script>
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
                    
                    // 다양한 초기화 방법 시도
                    if (typeof Entry.init === 'function') {
                        console.log("Entry.init 함수 사용");
                        Entry.init({
                            type: 'workspace',
                            container: 'entryContainer'
                        });
                    } else if (typeof Entry === 'function') {
                        console.log("Entry 생성자 함수 사용");
                        window.entry = new Entry({
                            type: 'workspace',
                            container: 'entryContainer'
                        });
                    } else {
                        console.log("대체 초기화 방법 시도");
                        // 기타 초기화 시도...
                    }
                    
                    // 프로젝트 로드 시도
                    if (projectFile) {
                        fetch(projectFile)
                            .then(response => response.json())
                            .then(data => {
                                if (typeof Entry.loadProject === 'function') {
                                    Entry.loadProject(data);
                                } else if (window.entry && typeof window.entry.loadProject === 'function') {
                                    window.entry.loadProject(data);
                                }
                                
                                // 시작 시도
                                if (typeof Entry.start === 'function') {
                                    Entry.start();
                                } else if (window.entry && typeof window.entry.start === 'function') {
                                    window.entry.start();
                                }
                            })
                            .catch(error => {
                                console.error("프로젝트 로드 실패:", error);
                                // 빈 프로젝트 로드
                                if (typeof Entry.loadProject === 'function') {
                                    Entry.loadProject();
                                } else if (window.entry && typeof window.entry.loadProject === 'function') {
                                    window.entry.loadProject();
                                }
                                
                                // 시작 시도
                                if (typeof Entry.start === 'function') {
                                    Entry.start();
                                } else if (window.entry && typeof window.entry.start === 'function') {
                                    window.entry.start();
                                }
                            });
                    } else {
                        // 빈 프로젝트 로드
                        if (typeof Entry.loadProject === 'function') {
                            Entry.loadProject();
                        } else if (window.entry && typeof window.entry.loadProject === 'function') {
                            window.entry.loadProject();
                        }
                        
                        // 시작 시도
                        if (typeof Entry.start === 'function') {
                            Entry.start();
                        } else if (window.entry && typeof window.entry.start === 'function') {
                            window.entry.start();
                        }
                    }
                    
                    console.log("Entry 초기화 완료");
                } catch (error) {
                    console.error("Entry 초기화 오류:", error);
                    document.getElementById('entryContainer').innerHTML = 
                        "<h2>Entry 초기화 중 오류 발생</h2><p>" + error.message + "</p>";
                }
            }, 500);
        });
    </script>
</body>
</html>`;
  
  res.send(html);
});

app.listen(PORT, () => {
  console.log(`Entry 서버가 http://localhost:${PORT} 에서 실행 중입니다`);
});