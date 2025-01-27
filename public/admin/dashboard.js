// public/admin/dashboard.js
async function fetchWithAuth(url) {
    const response = await fetch(url, {
        credentials: 'include',  // 세션 쿠키 포함
        headers: {
            'Accept': 'application/json'
        }
    });
    if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
    }
    return response.json();
}

async function loadStats() {
    try {
        const result = await fetchWithAuth('/admin/api/stats');
        if (result.success && result.data) {
            updateDashboardStats(result.data);
        }
    } catch (error) {
        console.error('Error loading stats:', error);
        if (error.message.includes('401')) {
            window.location.href = '/auth/login';  // 인증 실패시 로그인 페이지로 이동
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
        const result = await fetchWithAuth('/admin/api/stats');
        if (!result.success || !result.data?.centerStats) return;

        const tbody = document.getElementById('centersTableBody');
        tbody.innerHTML = result.data.centerStats.map(center => `
            <tr>
                <td>${center.centerID} (${center.centerName || '미지정'})</td>
                <td>${center.total_users || 0}</td>
                <td>${center.student_count || 0}</td>
                <td>${center.manager_count || 0}</td>
                <td>${center.teacher_count || 0}</td>
                <td>
                    <button class="btn btn-sm btn-primary">상세보기</button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading center stats:', error);
    }
}