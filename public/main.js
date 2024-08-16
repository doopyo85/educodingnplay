document.addEventListener("DOMContentLoaded", function() {
    const userEmailElement = document.getElementById("userEmail");
    const logoutButtonElement = document.getElementById('logoutButton');

    // userEmail 요소가 존재하는지 확인
    if (userEmailElement) {
        fetch('/get-user', { credentials: 'include' })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Network response was not ok');
                }
                return response.json();
            })
            .then(data => {
                userEmailElement.innerText = data.email || "로그인 정보 미확인";
            })
            .catch(error => {
                console.error('Error fetching user data:', error);
                userEmailElement.innerText = "로그인 정보 미확인";
            });
    }

    // logoutButton 요소가 존재하는지 확인
    if (logoutButtonElement) {
        logoutButtonElement.addEventListener('click', function() {
            window.location.href = '/logout';
        });
    }
});
