// public/admin/dashboard.js
async function fetchWithAuth(url) {
    const response = await fetch(url, {
        credentials: 'include',
        headers: {
            'Accept': 'application/json'
        }
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}


function updateDashboardStats(data) {
    if (!data?.totalStats) return;
    
    try {
        // 기본 통계 업데이트
        const elements = {
            'totalUsers': data.totalStats.total_users || 0,
            'studentCount': data.totalStats.student_count || 0,
            'managerCount': data.totalStats.manager_count || 0,
            'activeCenters': data.totalStats.active_centers || 0
        };

        Object.entries(elements).forEach(([id, value]) => {
            const element = document.getElementById(id);
            if (element) {
                element.textContent = value;
            }
        });
    } catch (error) {
        console.error('Error updating dashboard stats:', error);
    }
}

async function loadStats() {
    try {
        console.log('Fetching dashboard stats...');
        const result = await fetchWithAuth('/admin/api/stats');
        console.log('Received stats:', result);
        
        if (result.success && result.data) {
            updateDashboardStats(result.data);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        if (error.message.includes('401')) {
            window.location.href = '/auth/login';
        }
    }
}

async function loadUsers() {
    try {
        const result = await fetchWithAuth('/admin/api/users');
        if (!result.success || !result.data) return;

        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = result.data.map(user => `
            <tr>
                <td>${user.userID}</td>
                <td>${user.name || '-'}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${user.centerID ? `${user.centerID} (${user.centerName || '미지정'})` : '-'}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>-</td>
                <td>0</td>
                <td>
                    <button class="btn btn-sm btn-primary" disabled>활동보기</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadCenterStats() {
    try {
        console.log('Fetching center stats...');
        const result = await fetchWithAuth('/admin/api/stats');
        console.log('Received center stats:', result);

        if (!result.success || !result.data?.centerStats) {
            console.error('Invalid center stats data');
            return;
        }

        const tbody = document.getElementById('centersTableBody');
        if (!tbody) {
            console.error('Centers table body not found');
            return;
        }

        tbody.innerHTML = result.data.centerStats.map(center => `
            <tr>
                <td>${center.centerID} ${center.centerName ? `(${center.centerName})` : ''}</td>
                <td>${center.total_users || 0}</td>
                <td>${center.student_count || 0}</td>
                <td>${center.manager_count || 0}</td>
                <td>${center.teacher_count || 0}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="showCenterDetails(${center.centerID})">
                        상세보기
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading center stats:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    // 초기 로드
    loadStats();
    showSection('overview');
});

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
    const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
    if (activeLink) {
        activeLink.classList.add('active');
    }

    // 섹션별 데이터 로드
    switch(sectionName) {
        case 'overview':
            loadStats();
            break;
        case 'users':
            loadUsers();
            break;
        case 'centers':
            loadCenterStats();
            break;
    }
}