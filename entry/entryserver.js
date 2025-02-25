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
    
    <!-- 하드웨어 관련 모듈 대체 -->
    <script>
        // Lang 객체 (언어 정의)
        window.Lang = {
            Blocks: {},
            Workspace: {},
            Menus: {},
            General: {},
            Classes: {},
            DataAnalytics: {},
            Messages: {
                hello: "안녕하세요"
            },
            template: {},
            Buttons: {}
        };
        
        // 필요한 네임스페이스들 초기화
        window.EntryTool = {
            DataAnalytics: function() { return {}; }
        };
        window.EntryPaint = {};
        window.EntrySoundEditor = {};
        window.EntryVideoLegacy = {};
        
        // 하드웨어 관련 기능 비활성화
        window.__ENTRY_HARDWARE_MODULES = [];
        window.__ENTRY_HARDWARE_LIST = [];
        
        // Entry 기본 객체 (하드웨어 관련 오류 방지)
        window.Entry = window.Entry || {};
        Entry.hw = {
            initializeHardware: function() {},
            disconnectHardware: function() {},
            connectToBleDevice: function() {},
            sendMessage: function() {},
            downloadConnector: function() {},
            downloadGuide: function() {},
            setSocketMessage: function() {},
            disconnectSocket: function() {},
            update: function() {},
            setDigitalPortValue: function() {},
            getAnalogPortValue: function() {},
            getDigitalPortValue: function() {},
            sendQueue: {},
            portData: {}
        };
        
        // 모든 하드웨어 함수 대체
        Entry.HW = {
            TRIAL_LIMIT: 0,
            HARDWARE_LIST: [],
            programingLanguageList: [],
            MODULES: [],
            banAddList: [],
            downloadConnector: function() {},
            downloadGuide: function() {},
            getHardwareModuleList: function() { return []; }
        };
        
        // 하드웨어 블록 모의 객체
        Entry.HWMonitor = {
            prototype: {},
            hwModule: { 
                buzzer: function() {},
                leds: {},
                motor: function() {},
                output: function() {}
            }
        };
        
        // 메시지 관련 기능 오버라이드
        Entry.Utils = Entry.Utils || {};
        Entry.Utils.setMessages = function() {};
    </script>
    
    <!-- 스크립트 로드 -->
    <script src="/js/entry/entry-tool.js"></script>
    <script src="/js/entry/entry.js"></script>
    
    <script>
        // 하드웨어 관련 기능 완전 비활성화
        try {
            // 하드웨어 관련 함수 무효화
            const overrideMethods = [
                'initHardware', 'connectToBleDevice', 'setSocketMessage',
                'disconnectSocket', 'disconnectHardware', 'downloadConnector',
                'downloadGuide', 'setDigitalPortValue', 'getAnalogPortValue', 
                'getDigitalPortValue'
            ];
            
            overrideMethods.forEach(method => {
                if (Entry.hw && Entry.hw[method]) {
                    Entry.hw[method] = function() { 
                        console.log(`Hardware method ${method} called but disabled`);
                        return false;
                    };
                }
            });
            
            // 하드웨어 블록 비활성화
            Entry.HARDWARE_BLOCK = false;
            Entry.HARDWARE_LIST = [];
            
            if (Entry.block) {
                for (let key in Entry.block) {
                    if (key.includes('arduino') || key.includes('hw') || 
                        key.includes('board') || key.includes('robot')) {
                        delete Entry.block[key];
                    }
                }
            }
        } catch (e) {
            console.warn('Failed to disable hardware features:', e);
        }
        
        console.log("Entry 초기화 시작");
        
        $(document).ready(function() {
            setTimeout(function() {
                try {
                    const projectFile = "${projectFile}";
                    
                    // Entry 초기화
                    var options = {
                        type: 'workspace',
                        container: 'entryContainer',
                        blockInjectOption: {
                            importHardware: false
                        },
                        isForLecture: false,
                        hardwareEnable: false
                    };
                    
                    // 메시지 기능 재정의
                    if (typeof Entry.Utils !== 'undefined') {
                        Entry.Utils.setMessages = function() {};
                    }
                    
                    // 하드웨어 기능 오버라이드
                    if (Entry.hwLiteConnect) {
                        Entry.hwLiteConnect = function() { return false; };
                    }
                    
                    // 빈 프로젝트 로드
                    if (Entry.loadProject) {
                        // 기본 옵션 재정의
                        Entry.loadProject._emptyProject = {
                            category: '',
                            scenes: [{
                                name: 'Workspace',
                                objects: []
                            }],
                            variables: [],
                            messages: []
                        };
                        
                        // 프로젝트 불러오기
                        Entry.loadProject();
                    } else {
                        console.error('Entry.loadProject not found');
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