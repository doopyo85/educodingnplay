// header.js
document.addEventListener("DOMContentLoaded", function () {
    // 로그인 폼 제출 이벤트
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

    // 프로필 이미지 관리 로직
    // 세션 스토리지에서 프로필 정보 확인 (페이지 간 캐싱)
    const cachedProfile = sessionStorage.getItem('userProfileImage');
    const profileImage = document.getElementById('profileImage');
    const profileDropdownImage = document.getElementById('profileDropdownImage');
    
    // 캐시된 프로필이 있으면 즉시 적용
    if (cachedProfile) {
        if (profileImage) profileImage.src = cachedProfile;
        if (profileDropdownImage) profileDropdownImage.src = cachedProfile;
    }
    
    // 그리고 최신 정보 가져오기
    fetch('/api/get-profile-info')
        .then(response => response.json())
        .then(data => {
            if (data.success && data.profilePath) {
                // 프로필 이미지 업데이트
                if (profileImage) profileImage.src = data.profilePath;
                if (profileDropdownImage) profileDropdownImage.src = data.profilePath;
                
                // 세션 스토리지에 저장 (페이지 간 캐싱)
                sessionStorage.setItem('userProfileImage', data.profilePath);
            }
        })
        .catch(error => console.error('프로필 정보 로드 오류:', error));
});