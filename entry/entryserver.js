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
    
    <!-- 스타일시트 -->
    <link href="/js/entry/entry.css" rel="stylesheet" />
    
    <!-- 기본 라이브러리 -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/jquery/3.6.0/jquery.min.js"></script>
    <script src="https://cdnjs.cloudflare.com/ajax/libs/lodash.js/4.17.21/lodash.min.js"></script>
    <script src="https://code.createjs.com/1.0.0/preloadjs.min.js"></script>
    <script src="https://code.createjs.com/1.0.0/easeljs.min.js"></script>
    <script src="https://code.createjs.com/1.0.0/soundjs.min.js"></script>
    
    <style>
        html, body { margin: 0; padding: 0; width: 100%; height: 100%; }
        #entryContainer { width: 100%; height: 100%; }
        #errorMessage { 
            display: none; 
            position: absolute; 
            top: 50%; 
            left: 50%; 
            transform: translate(-50%, -50%);
            background: white;
            padding: 20px;
            border-radius: 10px;
            box-shadow: 0 0 10px rgba(0,0,0,0.3);
            max-width: 80%;
        }
    </style>
</head>
<body>
    <div id="entryContainer"></div>
    <div id="errorMessage"></div>
    
    <!-- 패치 스크립트 - Entry 로드 전에 실행됨 -->
    <script>
        // ----- 하드웨어 관련 패치 시작 -----
        // 모든 하드웨어 기능 무력화를 위한 보호 조치
        (function() {
            // 전역 패치 함수
            window.__patchEntryHardware = function() {
                if (!window.Entry) window.Entry = {};
                
                // 하드웨어 관련 속성 및 메서드 모두 비활성화
                var emptyFn = function() { return null; };
                
                // 하드웨어 속성 미리 정의
                Entry.hw = {
                    initializeHardware: emptyFn,
                    disconnectHardware: emptyFn,
                    update: emptyFn,
                    downloadConnector: emptyFn,
                    downloadGuide: emptyFn,
                    setDigitalPortValue: emptyFn,
                    getAnalogPortValue: emptyFn,
                    sendQueue: {},
                    portData: {}
                };
                
                // 하드웨어 모니터 클래스 무효화
                Entry.HWMonitor = function() {
                    this.hwModule = { 
                        buzzer: emptyFn,
                        getPort: emptyFn,
                        getHardwareVersion: emptyFn,
                        leds: {},
                        motor: emptyFn,
                        output: emptyFn
                    };
                    return this;
                };
                
                // 하드웨어 설정 값 변경
                Entry.HARDWARE_BLOCK = false;
                window.__ENTRY_HARDWARE_MODULES = [];
                window.__ENTRY_HARDWARE_LIST = [];
                
                console.log('[Entry] 하드웨어 기능이 비활성화되었습니다.');
            };
            
            // 미리 한 번 실행
            window.__patchEntryHardware();
            
            // Object.defineProperty를 사용해 Entry.HWMonitor 등이 변경되지 않도록 보호
            Object.defineProperty(window, 'EntryHW', {
                value: {
                    downloadConnector: emptyFn,
                    downloadGuide: emptyFn
                },
                writable: false,
                configurable: false
            });
            
            // 메시지 관련 기능 대체
            window.Lang = {
                Blocks: {},
                Workspace: {},
                Menus: {},
                General: {},
                template: {},
                Buttons: {},
                Messages: { hello: "안녕하세요" },
                DataAnalytics: {}
            };
        })();
        
        // Entry 로드 완료 후 추가 패치 적용 함수
        function patchEntryAfterLoad() {
            // Entry.Utils 패치
            if (Entry.Utils) {
                Entry.Utils.setMessages = function() {};
                Entry.Utils.isChrome = function() { return true; };
            }
            
            // Entry.loadProject 패치
            if (Entry.loadProject) {
                const originalLoadProject = Entry.loadProject;
                Entry.loadProject = function(project) {
                    try {
                        if (!project) {
                            // 빈 프로젝트 구조
                            project = {
                                category: '',
                                scenes: [{ name: 'Workspace', objects: [] }],
                                variables: [],
                                messages: [],
                                functions: []
                            };
                        }
                        return originalLoadProject.call(Entry, project);
                    } catch (e) {
                        console.error('프로젝트 로드 오류:', e);
                        showErrorMessage('프로젝트 로드 오류: ' + e.message);
                    }
                };
            }
            
            // 추가 하드웨어 패치
            window.__patchEntryHardware();
            
            console.log('[Entry] 추가 패치가 적용되었습니다.');
        }
        
        // 오류 메시지 표시 함수
        function showErrorMessage(message) {
            var errorDiv = document.getElementById('errorMessage');
            errorDiv.style.display = 'block';
            errorDiv.innerHTML = '<h3>Entry 초기화 오류</h3><p>' + message + '</p>';
        }
    </script>
    
    <!-- Entry 스크립트 -->
    <script src="/js/entry/entry.js"></script>
    
    <!-- 초기화 스크립트 -->
    <script>
        $(document).ready(function() {
            // Entry 로드 확인 및 초기화
            setTimeout(function() {
                try {
                    // Entry 객체 확인
                    if (typeof Entry === 'undefined') {
                        throw new Error('Entry 라이브러리를 불러올 수 없습니다.');
                    }
                    
                    // 추가 패치 적용
                    patchEntryAfterLoad();
                    
                    // 프로젝트 파일 경로
                    var projectFile = "${projectFile}";
                    
                    // 초기화 시도
                    console.log('Entry 초기화 시작');
                    
                    // 기본 작업공간 초기화
                    var container = document.getElementById('entryContainer');
                    Entry.init(container);
                    
                    // 빈 프로젝트 로드
                    Entry.loadProject();
                    
                    // 시작
                    Entry.start();
                    
                    console.log('Entry 초기화 완료');
                    
                    // 프로젝트 파일이 있으면 나중에 로드 (초기화 후)
                    if (projectFile) {
                        setTimeout(function() {
                            fetch(projectFile)
                                .then(function(response) { return response.json(); })
                                .then(function(data) {
                                    Entry.loadProject(data);
                                })
                                .catch(function(error) {
                                    console.error('프로젝트 로드 실패:', error);
                                });
                        }, 1000);
                    }
                } catch (error) {
                    console.error('Entry 초기화 오류:', error);
                    showErrorMessage(error.message);
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