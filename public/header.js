// header.js
document.addEventListener("DOMContentLoaded", function () {
    const userNameElement = document.getElementById("userName");
    const logoutButtonElement = document.getElementById('logoutButton');

    if (userNameElement) {
        fetch('/get-user-session', { 
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            console.log('Response status:', response.status);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            console.log('Received data:', data);
            if (data.username) {
                userNameElement.textContent = data.username;
            } else {
                userNameElement.textContent = '로그인 정보 없음';
            }
        })
        .catch(error => {
            console.error('Error fetching session data:', error);
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