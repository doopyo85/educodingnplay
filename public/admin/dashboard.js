async function updateDashboardStats(data) {
    if (!data || !data.totalStats) return;
    
    // 통계 카드 업데이트
    document.getElementById('totalUsers').textContent = data.totalStats.total_users;
    document.getElementById('studentCount').textContent = data.totalStats.student_count;
    document.getElementById('activeCenters').textContent = data.totalStats.active_centers;
    document.getElementById('managerCount').textContent = data.totalStats.manager_count;
}

async function loadUsers() {
    try {
        const response = await fetch('/admin/api/users');
        const result = await response.json();
        
        if (!result.success || !result.data) return;

        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = result.data.map(user => `
            <tr>
                <td>${user.userID}</td>
                <td>${user.name || '-'}</td>
                <td>${user.email}</td>
                <td>${user.role}</td>
                <td>${user.centerID || '-'}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>-</td>  <!-- 아직 활동 로그가 없으므로 '-' 표시 -->
                <td>0</td>  <!-- 아직 활동 로그가 없으므로 0 표시 -->
                <td>
                    <button class="btn btn-sm btn-primary" disabled>
                        활동보기
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadCenterStats() {
    try {
        const response = await fetch('/admin/api/stats');
        const result = await response.json();
        
        if (!result.success || !result.data) return;

        const tbody = document.getElementById('centersTableBody');
        tbody.innerHTML = result.data.centerStats.map(center => `
            <tr>
                <td>${center.centerID}</td>
                <td>${center.total_users}</td>
                <td>${center.student_count}</td>
                <td>${center.manager_count}</td>
                <td>${center.teacher_count}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="showSection('users')">
                        상세보기
                    </button>
                </td>
            </tr>
        `).join('');
    } catch (error) {
        console.error('Error loading center stats:', error);
    }
}