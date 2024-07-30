// 세션 유지 및 로그아웃 기능 정의
function initializeHeader() {
    // 세션 유지
    fetch('/get-user')
        .then(response => response.json())
        .then(data => {
            document.getElementById("userEmail").innerText = data.email || "로그인 정보 미확인";
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            document.getElementById("userEmail").innerText = "로그인 정보 미확인";
        });

    // 로그아웃 버튼 클릭 이벤트
    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
        logoutButton.addEventListener("click", function() {
            fetch('/auth/logout', { method: 'GET' })
                .then(() => {
                    window.location.href = '/auth/login'; // 로그아웃 후 로그인 페이지로 리디렉션
                })
                .catch(error => console.error('Error logging out:', error));
        });
    } else {
        console.error("Logout button not found");
    }
}

document.addEventListener("DOMContentLoaded", function() {
    $("#header-placeholder").load("/public/header.html", function() {
        initializeHeader(); // header.html이 로드된 후에 초기화 함수 실행
    });
});
