// header.js
document.addEventListener("DOMContentLoaded", function() {
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
    document.getElementById("logoutButton").addEventListener("click", function() {
        fetch('/auth/logout', { method: 'GET' })
            .then(() => {
                window.location.href = '/auth/login'; // 로그아웃 후 로그인 페이지로 리디렉션
            })
            .catch(error => console.error('Error logging out:', error));
    });
});
