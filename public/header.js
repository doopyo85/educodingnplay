// header.js
document.addEventListener("DOMContentLoaded", function () {
    // 로컬 스토리지 및 세션 스토리지 초기화 (크롬 캐시 문제 해결)
    if (window.location.pathname === '/logout') {
        localStorage.clear();
        sessionStorage.clear();
    }

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
                    // 로그인 성공 시 스토리지 초기화
                    localStorage.clear();
                    sessionStorage.clear();
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
    
    // 세션에서 사용자 정보 가져오기
    const sessionUserID = document.getElementById('sessionUserID')?.value;
    const sessionUserRole = document.getElementById('sessionUserRole')?.value;
    
    // 사용자 이름 엘리먼트
    const userNameElement = document.getElementById('userName');
    const profileDropdownUserID = document.getElementById('profileDropdownUserID');
    const profileDropdownRole = document.getElementById('profileDropdownRole');
    
    // 세션에서 가져온 값으로 사용자 정보 설정
    if (userNameElement && sessionUserID) userNameElement.textContent = sessionUserID;
    if (profileDropdownUserID && sessionUserID) profileDropdownUserID.textContent = sessionUserID;
    if (profileDropdownRole && sessionUserRole) profileDropdownRole.textContent = sessionUserRole;
    
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
                
                // 프로필 선택기 초기화
                initProfileSelector(data.profilePath);
            }
        })
        .catch(error => console.error('프로필 정보 로드 오류:', error));
        
    // 프로필 선택기 초기화 함수
    function initProfileSelector(selectedProfilePath) {
        const defaultProfiles = [
            '/resource/profiles/default.webp',
            '/resource/profiles/profile1.webp',
            '/resource/profiles/profile2.webp',
            '/resource/profiles/profile3.webp',
            '/resource/profiles/profile4.webp',
            '/resource/profiles/profile5.webp'
        ];
        
        const defaultProfileContainer = document.getElementById('defaultProfileContainer');
        
        if (defaultProfileContainer) {
            defaultProfileContainer.innerHTML = '';
            
            defaultProfiles.forEach(profile => {
                const profileDiv = document.createElement('div');
                profileDiv.className = `profile-image-item m-2 ${profile === selectedProfilePath ? 'selected' : ''}`;
                profileDiv.dataset.profile = profile;
                
                profileDiv.innerHTML = `
                    <img src="${profile}" alt="Profile" class="rounded-circle" 
                         style="width: 60px; height: 60px; cursor: pointer; 
                         ${profile === selectedProfilePath ? 'border: 3px solid #0d6efd;' : ''}">
                `;
                
                profileDiv.addEventListener('click', function() {
                    // 모든 프로필에서 선택 표시 제거
                    document.querySelectorAll('.profile-image-item').forEach(item => {
                        item.classList.remove('selected');
                        item.querySelector('img').style.border = 'none';
                    });
                    
                    // 현재 선택된 프로필에 선택 표시 추가
                    this.classList.add('selected');
                    this.querySelector('img').style.border = '3px solid #0d6efd';
                });
                
                defaultProfileContainer.appendChild(profileDiv);
            });
        }
        
        // 프로필 저장 버튼
        const saveProfileButton = document.getElementById('saveProfileButton');
        if (saveProfileButton) {
            saveProfileButton.addEventListener('click', function() {
                // 현재 선택된 프로필 찾기
                const selectedItem = document.querySelector('.profile-image-item.selected');
                if (selectedItem) {
                    const selectedProfile = selectedItem.dataset.profile;
                    
                    // DB에 저장
                    saveProfileToDB(selectedProfile);
                }
            });
        }
    }
    
    // 프로필을 DB에 저장하는 함수
    function saveProfileToDB(profilePath) {
        fetch('/api/save-profile-to-db', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ profilePath: profilePath })
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // 프로필 이미지 업데이트
                if (profileImage) profileImage.src = profilePath;
                if (profileDropdownImage) profileDropdownImage.src = profilePath;
                
                // 캐시 업데이트
                sessionStorage.setItem('userProfileImage', profilePath);
                
                // 모달 닫기
                const modal = bootstrap.Modal.getInstance(document.getElementById('profileModal'));
                if (modal) modal.hide();
                
                alert('프로필이 저장되었습니다.');
            } else {
                alert('프로필 저장 실패: ' + (data.message || '알 수 없는 오류'));
            }
        })
        .catch(error => {
            console.error('Error:', error);
            alert('프로필 저장 중 오류가 발생했습니다.');
        });
    }
});