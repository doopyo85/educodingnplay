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
            Messages: {},  // 메시지 관련 네임스페이스 추가
            template: {},
            Buttons: {}
        };
        
        // Messages 초기화
        Lang.Messages = {
            hello: "안녕하세요"
        };
        
        // 하드웨어 블록 관련 오류 해결
        window.Entry = window.Entry || {};
        window.Entry.HWMonitor = {
            hwModule: {
                buzzer: function() {}
            }
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
                    
                    // 몇 가지 오류 우회
                    Entry.setMessages = Entry.setMessages || function(msg) { 
                        console.log('setMessages called with:', msg);
                    };
                    
                    // 하드웨어 블록 비활성화
                    Entry.HARDWARE_BLOCK = false;
                    
                    // Entry 초기화
                    var initOption = {
                        type: 'workspace',
                        container: 'entryContainer',
                        blockInjectOption: {
                            importHardware: false
                        },
                        hardwareEnable: false,
                        loadProject: false
                    };
                    
                    if (typeof Entry.init === 'function') {
                        Entry.init(initOption);
                    } else if (typeof Entry === 'function') {
                        window.entry = new Entry(initOption);
                    }
                    
                    // 기본 프로젝트 로드
                    if (typeof Entry.loadProject === 'function') {
                        Entry.loadProject();
                    } else if (window.entry && typeof window.entry.loadProject === 'function') {
                        window.entry.loadProject();
                    }
                    
                    // Entry 시작
                    if (typeof Entry.start === 'function') {
                        Entry.start();
                    } else if (window.entry && typeof window.entry.start === 'function') {
                        window.entry.start();
                    }
                    
                    console.log("Entry 초기화 완료");
                    
                    // 프로젝트 파일이 있는 경우 나중에 시도
                    if (projectFile) {
                        setTimeout(function() {
                            console.log("프로젝트 파일 로드 시도:", projectFile);
                            try {
                                fetch(projectFile)
                                    .then(response => response.json())
                                    .then(data => {
                                        console.log("프로젝트 데이터 로드됨");
                                        if (typeof Entry.loadProject === 'function') {
                                            Entry.loadProject(data);
                                        } else if (window.entry && typeof window.entry.loadProject === 'function') {
                                            window.entry.loadProject(data);
                                        }
                                    })
                                    .catch(error => {
                                        console.error("프로젝트 로드 실패:", error);
                                    });
                            } catch (projectError) {
                                console.error("프로젝트 로드 오류:", projectError);
                            }
                        }, 1000);
                    }
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