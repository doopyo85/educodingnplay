document.addEventListener("DOMContentLoaded", function () {
    const userNameElement = document.getElementById("userName");
    const logoutButtonElement = document.getElementById('logoutButton');

    if (userNameElement) {
        // 세션 정보를 가져오는 API 호출
        fetch('/get-user-session', {
            credentials: 'include'
        })
        .then(response => response.json())
        .then(data => {
            if (data.username) {
                userNameElement.innerText = data.username;
            } else {
                userNameElement.innerText = "로그인 정보 미확인";
            }
        })
        .catch(error => {
            console.error('Error fetching session data:', error);
            userNameElement.innerText = "로그인 정보 미확인";
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