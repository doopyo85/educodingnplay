// iframe-style-injector.js
function injectStyleToIframe(iframe) {
    iframe.addEventListener('load', function() {
        var style = document.createElement('style');
        style.textContent = `
            body {
                font-family: Arial, sans-serif !important;
                font-size: 14px !important;
                line-height: 1.6 !important;
                color: #333 !important;
                padding: 5% 5% 0 5% !important;
                margin: 0 !important;
                box-sizing: border-box !important;
            }
            
            ::-webkit-scrollbar {
                width: 10px !important;
            }
            
            ::-webkit-scrollbar-track {
                background: #f1f1f1 !important;
            }
            
            ::-webkit-scrollbar-thumb {
                background: #888 !important;
                border-radius: 5px !important;
            }
            
            ::-webkit-scrollbar-thumb:hover {
                background: #555 !important;
            }
        `;
        
        var iframeHead = iframe.contentDocument.head || iframe.contentDocument.getElementsByTagName('head')[0];
        iframeHead.appendChild(style);
        
        // 기존 스타일 시트 비활성화
        var existingStyles = iframe.contentDocument.getElementsByTagName('style');
        for (var i = 0; i < existingStyles.length; i++) {
            if (existingStyles[i] !== style) {
                existingStyles[i].disabled = true;
            }
        }
        
        var existingLinks = iframe.contentDocument.getElementsByTagName('link');
        for (var i = 0; i < existingLinks.length; i++) {
            if (existingLinks[i].rel === 'stylesheet') {
                existingLinks[i].disabled = true;
            }
        }
    });
}

// 사용 예:
window.addEventListener('load', function() {
    var iframe = document.getElementById('iframeContent');
    injectStyleToIframe(iframe);
});