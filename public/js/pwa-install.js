// PWA 설치 관련 변수
let deferredPrompt;
const installButtons = document.querySelectorAll('#pwa-install-btn');

// 디바이스 타입 확인 함수들
function isIOS() {
    return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

function isMobile() {
    return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
}

// 페이지 로드 시 설치 버튼 이벤트 리스너 설정
document.addEventListener('DOMContentLoaded', () => {
    installButtons.forEach(btn => {
        if (btn) {
            // 디바이스 타입에 따른 이벤트 리스너 설정
            if (isIOS()) {
                btn.addEventListener('click', showIOSInstallInstructions);
                // iOS 디바이스면 아이콘 변경
                btn.querySelector('i').classList.remove('bi-pc-display');
                btn.querySelector('i').classList.add('bi-phone');
                btn.setAttribute('data-bs-original-title', '홈 화면에 바로가기 추가');
            } else if (isMobile()) {
                btn.addEventListener('click', installPWA);
                // 모바일 디바이스면 아이콘 변경
                btn.querySelector('i').classList.remove('bi-pc-display');
                btn.querySelector('i').classList.add('bi-phone');
                btn.setAttribute('data-bs-original-title', '홈 화면에 바로가기 추가');
            } else {
                // 데스크톱이면 기본 아이콘 유지 (bi-pc-display)
                btn.addEventListener('click', installPWA);
            }
        }
    });
});