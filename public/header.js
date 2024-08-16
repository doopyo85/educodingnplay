document.addEventListener("DOMContentLoaded", function() {
    fetch('/get-user', { credentials: 'include' })
        .then(response => {
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            document.getElementById("userEmail").innerText = data.email || "로그인 정보 미확인";
        })
        .catch(error => {
            console.error('Error fetching user data:', error);
            document.getElementById("userEmail").innerText = "로그인 정보 미확인";
        });
    
    document.getElementById('logoutButton').addEventListener('click', function() {
        window.location.href = '/logout';
    });
});
