// ide-font-control.js

document.addEventListener('DOMContentLoaded', function() {
    const editor = document.getElementById('editor');
    const increaseFontSizeBtn = document.getElementById('increaseFontSize');
    const decreaseFontSizeBtn = document.getElementById('decreaseFontSize');
    
    let currentFontSize = 14; // 기본 폰트 크기
    
    function updateFontSize(size) {
        editor.style.fontSize = size + 'px';
    }
    
    increaseFontSizeBtn.addEventListener('click', function() {
        if (currentFontSize < 24) { // 최대 크기 제한
            currentFontSize += 2;
            updateFontSize(currentFontSize);
        }
    });
    
    decreaseFontSizeBtn.addEventListener('click', function() {
        if (currentFontSize > 10) { // 최소 크기 제한
            currentFontSize -= 2;
            updateFontSize(currentFontSize);
        }
    });
});