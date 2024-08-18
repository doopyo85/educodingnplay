// header.js 파일은 헤더를 로드하는 스크립트 파일입니다.
document.addEventListener("DOMContentLoaded", function () {
    // 헤더 로드
    $("#header-placeholder").load("/public/header.html", function () {
        // 헤더 로드 후에 요소들이 존재하므로 그때 이벤트 핸들러를 등록
        const userEmailElement = document.getElementById("userEmail");
        const logoutButtonElement = document.getElementById('logoutButton');

        if (userEmailElement) {
            // 세션 정보를 가져오는 API 호출
            fetch('/get-user-session', { credentials: 'include' })
                .then(response => {
                    if (!response.ok) {
                    throw new Error('Network response was not ok');
                    }
                    return response.json();
                })
                .then(data => {
                    if (data.loggedIn) {
                    userEmailElement.innerText = data.username || "로그인 정보 미확인";
                    } else {
                    userEmailElement.innerText = "로그인 정보 미확인";
                    }
                })
                .catch(error => {
                    console.error('Error fetching session data:', error);
                    userEmailElement.innerText = "로그인 정보 미확인";
                });
        }

        if (logoutButtonElement) {
            logoutButtonElement.addEventListener('click', function () {
                window.location.href = '/logout';
            });
        }
    });
});
