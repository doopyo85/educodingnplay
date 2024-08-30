document.addEventListener("DOMContentLoaded", function () {
    // 헤더를 동적으로 로드
    $("#header-placeholder").load("/public/header.html", function () {
        // 헤더가 로드된 후에 아래 코드가 실행되도록 수정

        // 헤더 관련 기능 구현
        const userEmailElement = document.getElementById("userEmail");
        const logoutButtonElement = document.getElementById('logoutButton');

        if (userEmailElement) {
            // 세션 정보를 가져오는 API 호출
            fetch('/get-user-session', {
                credentials: 'include',
                headers: {
                    'Authorization': `Bearer ${document.cookie.split('token=')[1]?.split(';')[0] || ''}`
                }
            })
            .then(response => response.json())
            .then(data => {
                if (data.username) {
                    userEmailElement.innerText = data.username;
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
