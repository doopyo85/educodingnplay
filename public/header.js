// header.js
document.addEventListener("DOMContentLoaded", function () {
    const userNameElement = document.getElementById("userName");
    
    if (userNameElement) {
        fetch('/api/get-user-session', { 
            credentials: 'include',
            headers: {
                'Accept': 'application/json',
                'Content-Type': 'application/json'
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            if (data.userID) {  // userID로 변경
                userNameElement.textContent = data.userID;  // userID 표시
            } else {
                userNameElement.textContent = '로그인 정보 없음';
            }
        })
        .catch(error => {
            console.error('Error fetching session data:', error);
            userNameElement.textContent = '로그인 정보 없음';
        });
    }

});

// 로그인 폼 제출 이벤트 추가
document.addEventListener('DOMContentLoaded', function () {
    const loginForm = document.getElementById('loginForm');
    if (loginForm) {
        loginForm.addEventListener('submit', function (event) {
            event.preventDefault();

            const formData = new FormData(this);
            const data = Object.fromEntries(formData.entries());

            fetch('/auth/login_process', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                credentials: 'include',
                body: JSON.stringify(data)
            })
            .then(response => response.json())
            .then(result => {
                if (result.error) {
                    alert(result.error);
                } else {
                    window.location.href = result.redirect;
                }
            })
            .catch(error => {
                console.error('로그인 오류:', error);
                alert('로그인 중 오류가 발생했습니다.');
            });
        });
    }
});
