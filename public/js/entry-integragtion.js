document.addEventListener("DOMContentLoaded", function() {
    const entryFrame = document.getElementById('entryFrame');
    const loadingOverlay = document.getElementById('loadingOverlay');
    const projectFile = document.getElementById('project-file').value;
    const userID = document.getElementById('user-id').value;
    const backButton = document.getElementById('backToProjects');
    const helpBtn = document.getElementById('helpBtn');
    
    // 도움말 모달 초기화
    const helpModal = new bootstrap.Modal(document.getElementById('helpModal'));
    
    // 도움말 버튼 클릭 이벤트
    helpBtn.addEventListener('click', function() {
        helpModal.show();
    });
    
    // 프로젝트 목록으로 돌아가기
    backButton.addEventListener('click', function() {
        window.location.href = '/entry_project';
    });
    
    // Entry 초기화 함수
    function initializeEntry() {
        // Entry 공용 계정으로 자동 로그인할 URL 구성
        const entryBaseUrl = 'https://playentry.org';
        
        // 기본 Entry 작업 공간 URL
        let entryUrl = `${entryBaseUrl}/ws`;
        
        // 프로젝트 파일이 지정된 경우 해당 파일 로드
        if (projectFile) {
            entryUrl += `#file:${encodeURIComponent(projectFile)}`;
            
            // 프로젝트 로드 로그 기록
            logLearningActivity('entry_load_project', {
                projectUrl: projectFile,
                userID: userID
            });
        }
        
        // iframe 소스 설정 - 직접 URL 하드코딩
        entryFrame.src = entryUrl;
        
        // iframe 로드 이벤트
        entryFrame.onload = function() {
            console.log('Entry iframe loaded');
            
            // 로딩 오버레이 숨기기 (지연시간 추가)
            setTimeout(() => {
                loadingOverlay.style.display = 'none';
            }, 2000);
            
            // 30분마다 학습 활동 로그 기록 (사용자가 계속 작업 중인지 추적)
            setInterval(function() {
                logLearningActivity('entry_active_session', {
                    userID: userID
                });
            }, 30 * 60 * 1000); // 30분
        };
        
        // 5초 후에도 로드되지 않으면 오버레이 숨김 (타임아웃 방지)
        setTimeout(() => {
            if (loadingOverlay.style.display !== 'none') {
                loadingOverlay.style.display = 'none';
            }
        }, 10000);
    }
    
    // 학습 활동 로깅 함수
    function logLearningActivity(action, data) {
        try {
            fetch('/learning/log', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    action: action,
                    data: data,
                    timestamp: new Date().toISOString()
                })
            });
        } catch (error) {
            console.error('Error logging learning activity:', error);
        }
    }
    
    // iframe과의 메시지 교환 리스너
    window.addEventListener('message', function(event) {
        // 신뢰할 수 있는 출처에서 오는 메시지만 처리
        if (event.origin !== 'https://playentry.org') {
            return;
        }
        
        try {
            const message = event.data;
            
            // 메시지 유형에 따라 처리
            if (message.type === 'project_saved') {
                console.log('Project saved:', message.projectId);
                // 프로젝트 저장 로그 기록
                logLearningActivity('entry_save_project', {
                    projectId: message.projectId,
                    userID: userID
                });
            } else if (message.type === 'project_executed') {
                // 프로젝트 실행 로그 기록
                logLearningActivity('entry_run_project', {
                    userID: userID
                });
            }
        } catch (error) {
            console.error('Error processing message from Entry:', error);
        }
    });
    
    // Entry 초기화 시작
    initializeEntry();
});