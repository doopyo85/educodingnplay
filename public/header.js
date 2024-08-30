// header.js
document.addEventListener("DOMContentLoaded", function () {
    const userNameElement = document.getElementById("userName");
    const logoutButtonElement = document.getElementById('logoutButton');

    if (userNameElement) {
        // 세션 정보를 가져오는 API 호출
        fetch('/get-user-session')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json(); // JSON으로 파싱 시도
            })
            .then(data => {
                if (data.username) {
                    if (userNameElement) {
                        userNameElement.textContent = data.username;
                    }
                } else {
                    if (userNameElement) {
                        userNameElement.textContent = '로그인 정보 없음';
                    }
                }
            })
            .catch(error => {
                console.error('Error fetching session data:', error);
            });
    }

    if (logoutButtonElement) {
        logoutButtonElement.addEventListener('click', function () {
            fetch('/logout', {
                method: 'GET',
                credentials: 'include'
            })
            .then(() => {
                window.location.href = '/auth/login';
            })
            .catch(error => {
                console.error('Error during logout:', error);
            });
        });
    }
});
