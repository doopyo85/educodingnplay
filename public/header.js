// header.js
document.addEventListener("DOMContentLoaded", function () {
    const userNameElement = document.getElementById("userName");
    const logoutButtonElement = document.getElementById('logoutButton');

    if (userNameElement) {
        // 세션 정보를 가져오는 API 호출
        fetch('/get-user-session', { credentials: 'include' })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json(); // JSON으로 파싱 시도
            })
            .then(data => {
                if (data.username) {
                    userNameElement.textContent = data.username;
                } else {
                    userNameElement.textContent = '로그인 정보 없음';
                }
            })
            .catch(error => {
                console.error('Error fetching session data:', error);
                if (error instanceof SyntaxError) {
                    console.error('Response is not valid JSON. Actual response:', error.message);
                }
                userNameElement.textContent = '로그인 정보 없음';
            });
    } else {
        console.error('User name element not found');
    }

    if (logoutButtonElement) {
        logoutButtonElement.addEventListener('click', function () {
            fetch('/logout', {
                method: 'GET',
                credentials: 'include'
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Logout failed');
                }
                return response.text();
            })
            .then(() => {
                window.location.href = '/auth/login';
            })
            .catch(error => {
                console.error('Error during logout:', error);
            });
        });
    } else {
        console.error('Logout button not found');
    }
});