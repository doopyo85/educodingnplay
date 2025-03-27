// PWA 설치 관련 변수
let deferredPrompt;
const installButton = document.getElementById('pwa-install-btn');

// beforeinstallprompt 이벤트 처리 - 브라우저의 설치 프롬프트 캡처
window.addEventListener('beforeinstallprompt', (e) => {
  // 기본 설치 프롬프트 표시를 방지
  e.preventDefault();
  // 이벤트 저장
  deferredPrompt = e;
  // 설치 버튼 표시
  if (installButton) {
    installButton.style.display = 'inline-flex';
    installButton.addEventListener('click', installPWA);
  }
});

// 앱이 이미 설치되어 있을 경우 버튼 숨기기
window.addEventListener('appinstalled', () => {
  if (installButton) {
    installButton.style.display = 'none';
  }
  deferredPrompt = null;
  // 설치 완료 알림 표시
  showInstallMessage('코딩2가 홈 화면에 추가되었습니다!');
});

// PWA 설치 함수
function installPWA() {
  if (!deferredPrompt) {
    // iOS에서는 beforeinstallprompt 이벤트가 지원되지 않으므로
    // 대체 안내 메시지 표시
    showIOSInstallInstructions();
    return;
  }

  // 설치 프롬프트 표시
  deferredPrompt.prompt();
  
  // 사용자의 선택 처리
  deferredPrompt.userChoice.then((choiceResult) => {
    if (choiceResult.outcome === 'accepted') {
      console.log('사용자가 앱 설치를 수락했습니다.');
      if (installButton) {
        installButton.style.display = 'none';
      }
    } else {
      console.log('사용자가 앱 설치를 거부했습니다.');
    }
    deferredPrompt = null;
  });
}

// iOS용 설치 안내 (iOS는 자동 설치가 아닌 수동 과정이 필요)
function showIOSInstallInstructions() {
  const modal = document.createElement('div');
  modal.className = 'ios-install-modal';
  modal.innerHTML = `
    <div class="ios-install-content">
      <h3>홈 화면에 추가하는 방법</h3>
      <p>1. Safari 브라우저 하단의 <strong>공유</strong> 버튼을 탭하세요 <i class="bi bi-box-arrow-up"></i></p>
      <p>2. <strong>홈 화면에 추가</strong>를 선택하세요</p>
      <p>3. <strong>추가</strong>를 탭하세요</p>
      <button id="close-ios-modal" class="btn btn-primary">확인</button>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  // 모달 스타일 추가
  const style = document.createElement('style');
  style.textContent = `
    .ios-install-modal {
      position: fixed;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      background-color: rgba(0, 0, 0, 0.5);
      display: flex;
      justify-content: center;
      align-items: center;
      z-index: 9999;
    }
    .ios-install-content {
      background-color: white;
      padding: 20px;
      border-radius: 8px;
      max-width: 80%;
      text-align: center;
    }
  `;
  document.head.appendChild(style);
  
  // 모달 닫기 버튼 처리
  document.getElementById('close-ios-modal').addEventListener('click', () => {
    document.body.removeChild(modal);
  });
}

// 메시지 표시 함수
function showInstallMessage(message) {
  const messageElement = document.createElement('div');
  messageElement.className = 'install-message';
  messageElement.textContent = message;
  
  // 메시지 스타일 추가
  const style = document.createElement('style');
  style.textContent = `
    .install-message {
      position: fixed;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background-color: #4caf50;
      color: white;
      padding: 10px 20px;
      border-radius: 4px;
      box-shadow: 0 2px 5px rgba(0, 0, 0, 0.2);
      z-index: 9999;
      animation: fadeOut 4s forwards;
    }
    @keyframes fadeOut {
      0% { opacity: 1; }
      70% { opacity: 1; }
      100% { opacity: 0; visibility: hidden; }
    }
  `;
  document.head.appendChild(style);
  
  document.body.appendChild(messageElement);
  
  // 몇 초 후 메시지 제거
  setTimeout(() => {
    if (document.body.contains(messageElement)) {
      document.body.removeChild(messageElement);
    }
  }, 4000);
}

// iOS 디바이스 확인
function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) && !window.MSStream;
}

// 페이지 로드 시 iOS 디바이스인 경우 설치 버튼 항상 표시
document.addEventListener('DOMContentLoaded', () => {
  const installButton = document.getElementById('pwa-install-btn');
  if (installButton && isIOS()) {
    installButton.style.display = 'inline-flex';
    installButton.addEventListener('click', showIOSInstallInstructions);
  }
});