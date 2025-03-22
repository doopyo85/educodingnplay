// iframe-style-injector.js
const config = require('./config');

function injectStyleAndFixImagesToIframe(iframe) {
    iframe.addEventListener('load', function() {
        var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        
        // 스타일 주입
        var style = document.createElement('style');
        style.textContent = `
            body {
                font-family: 'Noto Sans KR', sans-serif;
                font-size: 16px;
                line-height: 1.6;
                color: #333;
                padding: 5% 5% 240px 5%;
                margin: 0;
                box-sizing: border-box;
            }
            
            /* 코드블럭 스타일 */
            pre, code {
                font-family: 'Consolas', 'Monaco', 'Courier New', monospace;
                background-color: #f5f5f5;
                border-radius: 3px;
            }
            
            code {
                padding: 2px 5px;
                font-size: 0.9em;
                color: #d63384;
            }
            
            pre {
                padding: 16px;
                overflow: auto;
                border: 1px solid #e1e4e8;
                border-radius: 6px;
                line-height: 1.45;
                background-color: #f6f8fa;
                margin-bottom: 16px;
            }
            
            pre code {
                background-color: transparent;
                padding: 0;
                border-radius: 0;
                color: #24292e;
                font-size: 0.9em;
                white-space: pre;
                overflow-x: auto;
                word-wrap: normal;
                display: block;
            }
            
            /* Python 구문 강조 기본 스타일 */
            .keyword {
                color: #0000FF;
                font-weight: bold;
            }
            
            .string {
                color: #008000;
            }
            
            .comment {
                color: #808080;
                font-style: italic;
            }
            
            .number {
                color: #FF8000;
            }
            
            .operator {
                color: #800000;
            }
            
            /* 실제 DOM 요소로 하단 여백 추가 */
            body::after {
                content: '';
                display: block;
                height: 300px;
                width: 100%;
                clear: both;
            }
            
            /* 스크롤바 스타일 */
            ::-webkit-scrollbar {
                width: 10px;
            }
            
            ::-webkit-scrollbar-track {
                background: #f1f1f1;
            }
            
            ::-webkit-scrollbar-thumb {
                background: #888;
                border-radius: 5px;
            }
            
            ::-webkit-scrollbar-thumb:hover {
                background: #555;
            }
        `;
        
        iframeDoc.head.appendChild(style);
        
        // 기존 스타일 시트 비활성화
        var existingStyles = iframeDoc.getElementsByTagName('style');
        for (var i = 0; i < existingStyles.length; i++) {
            if (existingStyles[i] !== style) {
                existingStyles[i].disabled = true;
            }
        }
        
        var existingLinks = iframeDoc.getElementsByTagName('link');
        for (var i = 0; i < existingLinks.length; i++) {
            if (existingLinks[i].rel === 'stylesheet') {
                existingLinks[i].disabled = true;
            }
        }
        
        // 이미지 주소 수정
        var images = iframeDoc.getElementsByTagName('img');
        for (var i = 0; i < images.length; i++) {
            var src = images[i].src;
            if (src.startsWith(`${config.BASE_URL}/`)) {
                var newSrc = src.replace(`${config.BASE_URL}/`, `${config.S3_URL}/`);
                images[i].src = newSrc;
            }
        }
        
        // 코드 블록 처리 향상
        enhanceCodeBlocks(iframeDoc);

        // Python 구문 강조 적용
        setTimeout(function() {
            applyPythonSyntaxHighlighting(doc);
        }, 100);


        // 실제 DOM 요소로 여백 추가
        var spacerDiv = iframeDoc.createElement('div');
        spacerDiv.style.height = '300px';
        spacerDiv.style.width = '100%';
        spacerDiv.style.clear = 'both';
        
        // 문서 맨 끝에 여백 div 추가
        iframeDoc.body.appendChild(spacerDiv);
    });
}

// 코드 블록 처리를 위한 함수
function enhanceCodeBlocks(doc) {
    // 1. 이미 <pre><code> 형태로 작성된 코드블럭 처리
    var preBlocks = doc.getElementsByTagName('pre');
    for (var i = 0; i < preBlocks.length; i++) {
        preBlocks[i].classList.add('code-block');
        
        // pre 내부에 code 태그가 없는 경우 추가
        if (preBlocks[i].getElementsByTagName('code').length === 0) {
            var content = preBlocks[i].innerHTML;
            var codeElement = doc.createElement('code');
            codeElement.innerHTML = content;
            preBlocks[i].innerHTML = '';
            preBlocks[i].appendChild(codeElement);
        }
    }
    
    // 2. 일반 텍스트에서 Python 코드로 보이는 부분 찾아서 코드블럭으로 변환
    var paragraphs = doc.getElementsByTagName('p');
    for (var i = 0; i < paragraphs.length; i++) {
        var text = paragraphs[i].innerText;
        
        // Python 코드로 보이는 패턴 확인 (예: def, import, print 등이 있는지)
        if (/\b(def|class|import|from|print|if|else|for|while|return)\b/.test(text) && 
            /[=:+\-*/<>]/.test(text)) {
            
            // 이미 코드 형식이 적용되어 있는지 확인
            if (!paragraphs[i].querySelector('pre, code') && !paragraphs[i].closest('pre, code')) {
                // 코드블럭으로 변환
                var pre = doc.createElement('pre');
                pre.classList.add('code-block');
                pre.classList.add('python');
                
                var code = doc.createElement('code');
                code.innerHTML = text;
                
                pre.appendChild(code);
                
                // 원래 문단 대체
                paragraphs[i].parentNode.replaceChild(pre, paragraphs[i]);
            }
        }
    }
    
    // 3. 인라인 코드 처리 - 백틱(`)으로 둘러싸인 부분
    var textNodes = getTextNodes(doc.body);
    for (var i = 0; i < textNodes.length; i++) {
        var node = textNodes[i];
        var text = node.nodeValue;
        
        // 백틱으로 둘러싸인 부분을 찾아 인라인 코드로 변환
        if (text.indexOf('`') !== -1) {
            var parts = text.split('`');
            if (parts.length > 2) { // 최소 한 쌍의 백틱이 있어야 함
                var parent = node.parentNode;
                var container = doc.createDocumentFragment();
                
                for (var j = 0; j < parts.length; j++) {
                    if (j % 2 === 0) { // 백틱 바깥 부분
                        container.appendChild(doc.createTextNode(parts[j]));
                    } else { // 백틱 안쪽 부분
                        var code = doc.createElement('code');
                        code.textContent = parts[j];
                        container.appendChild(code);
                    }
                }
                
                parent.replaceChild(container, node);
            }
        }
    }
}

// 문서 내의 모든 텍스트 노드를 가져오는 헬퍼 함수
function getTextNodes(node) {
    var textNodes = [];
    
    function getTextNodesRecursive(node) {
        if (node.nodeType === 3) { // Text 노드
            textNodes.push(node);
        } else if (node.nodeType === 1) { // Element 노드
            // pre나 code 내부는 건너뜀
            if (node.tagName.toLowerCase() !== 'pre' && node.tagName.toLowerCase() !== 'code') {
                for (var i = 0; i < node.childNodes.length; i++) {
                    getTextNodesRecursive(node.childNodes[i]);
                }
            }
        }
    }
    
    getTextNodesRecursive(node);
    return textNodes;
}

// 사용 예:
window.addEventListener('load', function() {
    var iframe = document.getElementById('iframeContent');
    injectStyleAndFixImagesToIframe(iframe);
});