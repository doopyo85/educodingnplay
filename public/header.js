document.addEventListener("DOMContentLoaded", function () {
    const userEmailElement = document.getElementById("userEmail");
    const logoutButtonElement = document.getElementById('logoutButton');

    if (userEmailElement) {
        // 세션 정보를 가져오는 API 호출
        fetch('/get-user-session', {
            credentials: 'include'
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
            fetch('/auth/logout', {
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
