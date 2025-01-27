// public/admin/dashboard.js
async function loadStats() {
    try {
        console.log('Fetching dashboard stats...');
        const response = await fetch('/admin/api/stats');
        
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        
        const result = await response.json();
        console.log('Received stats:', result);
        
        if (result.success) {
            updateDashboardStats(result.data);
        } else {
            throw new Error(result.error || 'Failed to load stats');
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// public/admin/dashboard.js

// 사용자 목록 로드
async function loadUsers() {
    try {
        console.log('Loading users...');
        const response = await fetch('/admin/api/users');
        const result = await response.json();
        
        if (result.success) {
            const tbody = document.getElementById('usersTableBody');
            tbody.innerHTML = result.data.map(user => `
                <tr>
                    <td>${user.userID}</td>
                    <td>${user.name || '-'}</td>
                    <td>${user.email}</td>
                    <td>${user.role}</td>
                    <td>${user.centerID || '-'}</td>
                    <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    <td>${user.last_activity ? new Date(user.last_activity).toLocaleString() : '-'}</td>
                    <td>${user.activity_count || 0}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="showUserActivities(${user.id})">
                            활동보기
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// 섹션 전환 함수 수정
function showSection(sectionName) {
    // 모든 섹션 숨기기
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // 선택된 섹션 보이기
    const selectedSection = document.getElementById(`${sectionName}-section`);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }
    
    // 메뉴 활성화 상태 변경
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    document.querySelector(`[data-section="${sectionName}"]`).classList.add('active');
    
    // 섹션별 데이터 로드
    switch(sectionName) {
        case 'users':
            loadUsers();
            break;
        case 'centers':
            loadCenterStats();
            break;
    }
}

// 센터별 통계 로드
async function loadCenterStats() {
    try {
        const response = await fetch('/admin/api/stats');
        const result = await response.json();
        
        if (result.success) {
            const tbody = document.getElementById('centersTableBody');
            tbody.innerHTML = result.data.centerStats.map(center => `
                <tr>
                    <td>${center.centerID}</td>
                    <td>${center.user_count}</td>
                    <td>${center.student_count}</td>
                    <td>${center.manager_count}</td>
                    <td>${center.teacher_count}</td>
                    <td>
                        <button class="btn btn-sm btn-primary" onclick="showCenterDetails(${center.centerID})">
                            상세보기
                        </button>
                    </td>
                </tr>
            `).join('');
        }
    } catch (error) {
        console.error('Error loading center stats:', error);
    }
}

// 초기 로드 시 실행
document.addEventListener('DOMContentLoaded', () => {
    showSection('overview');  // 기본 섹션 표시
});