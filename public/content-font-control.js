// content-font-control.js
document.addEventListener('DOMContentLoaded', function() {
    // 버튼 생성 및 추가
    function createFontSizeControls() {
        // 컨트롤 컨테이너 생성
        const controlsContainer = document.createElement('div');
        controlsContainer.id = 'content-font-controls';
        controlsContainer.className = 'content-font-controls';
        
        // 폰트 축소 버튼
        const decreaseBtn = document.createElement('button');
        decreaseBtn.id = 'decreaseContentFont';
        decreaseBtn.className = 'font-control-btn';
        decreaseBtn.innerHTML = '<i class="bi bi-dash-circle"></i>';
        decreaseBtn.title = '콘텐츠 폰트 크기 줄이기';
        
        // 폰트 확대 버튼
        const increaseBtn = document.createElement('button');
        increaseBtn.id = 'increaseContentFont';
        increaseBtn.className = 'font-control-btn';
        increaseBtn.innerHTML = '<i class="bi bi-plus-circle"></i>';
        increaseBtn.title = '콘텐츠 폰트 크기 늘리기';
        
        // 버튼을 컨테이너에 추가
        controlsContainer.appendChild(decreaseBtn);
        controlsContainer.appendChild(increaseBtn);
        
        // IDE 토글 버튼 찾기
        const toggleBtn = document.getElementById('toggleEditor');
        if (toggleBtn) {
            // 토글 버튼 앞에 폰트 조절 컨트롤을 삽입
            toggleBtn.parentNode.insertBefore(controlsContainer, toggleBtn);
        } else {
            // 토글 버튼이 없으면 IDE 컨테이너에 직접 추가
            const ideContainer = document.querySelector('.ide-container');
            if (ideContainer) {
                ideContainer.appendChild(controlsContainer);
            }
        }
        
        return {
            decrease: decreaseBtn,
            increase: increaseBtn
        };
    }
    
    // 버튼 생성
    const fontButtons = createFontSizeControls();
    
    // 현재 폰트 크기 (%)를 저장하는 변수
    let contentFontSize = 100;
    
    // 로컬 스토리지에서 사용자 폰트 크기 설정 불러오기
    const savedFontSize = localStorage.getItem('contentFontSize');
    if (savedFontSize) {
        contentFontSize = parseInt(savedFontSize);
        applyFontSize(contentFontSize);
    }
    
    // 폰트 크기 적용 함수
    function applyFontSize(sizePercent) {
        const iframe = document.getElementById('iframeContent');
        if (!iframe) return;
        
        try {
            const iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
            if (!iframeDoc) return;
            
            // iframe 내부에 스타일 요소가 이미 있는지 확인
            let styleElement = iframeDoc.getElementById('content-font-size-style');
            
            if (!styleElement) {
                // 스타일 요소 생성
                styleElement = iframeDoc.createElement('style');
                styleElement.id = 'content-font-size-style';
                iframeDoc.head.appendChild(styleElement);
            }
            
            // 폰트 크기 스타일 설정
            styleElement.textContent = `
                body, p, div, span, li, h1, h2, h3, h4, h5, h6 {
                    font-size: ${sizePercent}% !important;
                }
                
                pre, code {
                    font-size: ${sizePercent * 0.9}% !important;
                }
            `;
            
            // 설정 저장
            localStorage.setItem('contentFontSize', sizePercent);
        } catch (e) {
            console.error('폰트 크기 적용 중 오류:', e);
        }
    }
    
    // 이벤트 리스너 설정
    fontButtons.decrease.addEventListener('click', function() {
        if (contentFontSize > 60) { // 최소 크기 제한
            contentFontSize -= 10;
            applyFontSize(contentFontSize);
        }
    });
    
    fontButtons.increase.addEventListener('click', function() {
        if (contentFontSize < 200) { // 최대 크기 제한
            contentFontSize += 10;
            applyFontSize(contentFontSize);
        }
    });
    
    // iframe이 로드될 때마다 폰트 크기 적용
    document.getElementById('iframeContent').addEventListener('load', function() {
        applyFontSize(contentFontSize);
    });
});