const config = require('./config');

// iframe-style-injector.js
function injectStyleAndFixImagesToIframe(iframe) {
    iframe.addEventListener('load', function() {
        var iframeDoc = iframe.contentDocument || iframe.contentWindow.document;
        
        // 스타일 주입
        var style = document.createElement('style');
        style.textContent = `
            body {
                font-family: 'Noto Sans KR', sans-serif; !important;
                font-size: 16px !important;
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
    });
}

// 사용 예:
window.addEventListener('load', function() {
    var iframe = document.getElementById('iframeContent');
    injectStyleAndFixImagesToIframe(iframe);
});