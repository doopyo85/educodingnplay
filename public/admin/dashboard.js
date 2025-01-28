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

async function loadUsers(sortField = 'no', sortOrder = 'asc', filter = {}) {
    try {
        const result = await fetchWithAuth('/admin/api/users');
        if (!result.success || !result.data) return;

        let filteredData = result.data;

        // 필터 적용
        Object.entries(filter).forEach(([field, value]) => {
            if (value) {
                filteredData = filteredData.filter(user => {
                    // centerID 필드는 센터명까지 포함하여 검색
                    if (field === 'centerID') {
                        const centerInfo = `${user.centerID} ${user.centerName || ''}`.toLowerCase();
                        return centerInfo.includes(value.toLowerCase());
                    }
                    // 다른 필드들은 기존처럼 포함 여부로 검색
                    return String(user[field]).toLowerCase().includes(value.toLowerCase());
                });
            }
        });

        // 정렬 적용
        filteredData.sort((a, b) => {
            let comparison = 0;
            if (a[sortField] < b[sortField]) comparison = -1;
            if (a[sortField] > b[sortField]) comparison = 1;
            return sortOrder === 'asc' ? comparison : -comparison;
        });

        const tbody = document.getElementById('usersTableBody');
        tbody.innerHTML = filteredData.map(user => `
            <tr>
                <td>${user.no}</td>
                <td>${user.userID}</td>
                <td>${user.name || '-'}</td>
                <td>${user.role}</td>
                <td>${user.centerID ? `${user.centerID} (${user.centerName})` : '-'}</td>
                <td>${user.last_activity ? new Date(user.last_activity).toLocaleString() : '-'}</td>
                <td>${user.activity_count || 0}</td>
                <td>${user.email}</td>
                <td>${new Date(user.created_at).toLocaleDateString()}</td>
                <td>
                    <button class="btn btn-sm btn-primary" onclick="showUserActivities(${user.id})">
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

// 권한 매트릭스 로드
async function loadPermissionsMatrix() {
    try {
        const result = await fetchWithAuth('/admin/api/permissions');
        if (!result.success) return;

        const tbody = document.getElementById('permissionsTableBody');
        const permissions = result.data.pages;
        const roles = ['admin', 'kinder', 'school', 'manager', 'teacher', 'student'];

        tbody.innerHTML = Object.entries(permissions).map(([page, config]) => `
            <tr>
                <td class="align-middle">
                    <div class="fw-bold">${config.name}</div>
                    <small class="text-muted">${page}</small>
                </td>
                ${roles.map(role => `
                    <td class="text-center">
                        <div class="form-check d-flex justify-content-center">
                            <input class="form-check-input permission-checkbox" 
                                   type="checkbox" 
                                   ${config.roles.includes(role) ? 'checked' : ''}
                                   data-page="${page}"
                                   data-role="${role}"
                                   id="perm_${page.replace('/', '_')}_${role}">
                        </div>
                    </td>
                `).join('')}
            </tr>
        `).join('');

        // "전체 선택" 행 추가
        const allSelectRow = `
            <tr class="table-light">
                <td class="align-middle fw-bold">전체 선택</td>
                ${roles.map(role => `
                    <td class="text-center">
                        <div class="form-check d-flex justify-content-center">
                            <input class="form-check-input select-all-role" 
                                   type="checkbox" 
                                   data-role="${role}"
                                   id="select_all_${role}">
                        </div>
                    </td>
                `).join('')}
            </tr>
        `;
        tbody.insertAdjacentHTML('afterbegin', allSelectRow);

        // 전체 선택 이벤트 리스너
        document.querySelectorAll('.select-all-role').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const role = e.target.dataset.role;
                const checkboxes = document.querySelectorAll(`.permission-checkbox[data-role="${role}"]`);
                checkboxes.forEach(box => box.checked = e.target.checked);
            });
        });

        // 저장 버튼 이벤트 리스너
        document.getElementById('savePermissions').addEventListener('click', savePermissionChanges);
    } catch (error) {
        console.error('Error loading permissions:', error);
    }
}

// 권한 변경사항 저장
async function savePermissionChanges() {
    try {
        const permissions = {};
        const checkboxes = document.querySelectorAll('.permission-checkbox');
        
        // 페이지별로 권한 수집
        checkboxes.forEach(checkbox => {
            const page = checkbox.dataset.page;
            const role = checkbox.dataset.role;
            
            if (!permissions[page]) {
                permissions[page] = {
                    name: checkbox.closest('tr').querySelector('div.fw-bold').textContent,
                    roles: []
                };
            }
            
            if (checkbox.checked) {
                permissions[page].roles.push(role);
            }
        });

        const response = await fetch('/admin/api/permissions', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            credentials: 'include',
            body: JSON.stringify({ pages: permissions })
        });

        const result = await response.json();
        if (result.success) {
            showToast('성공', '권한 설정이 저장되었습니다.', 'success');
        } else {
            throw new Error(result.error);
        }
    } catch (error) {
        console.error('Error saving permissions:', error);
        showToast('오류', '권한 설정 저장 중 오류가 발생했습니다.', 'error');
    }
}


function showSection(sectionName) {
    console.log('Showing section:', sectionName);
    
    // 모든 섹션 숨기기
    document.querySelectorAll('.section').forEach(section => {
        section.style.display = 'none';
    });
    
    // 선택된 섹션 보이기
    const selectedSection = document.getElementById(`${sectionName}-section`);
    console.log('Selected section element:', selectedSection);
    if (selectedSection) {
        selectedSection.style.display = 'block';
    }
    
    // 메뉴 활성화 상태 변경
    document.querySelectorAll('.nav-link').forEach(link => {
        link.classList.remove('active');
    });
    const activeLink = document.querySelector(`[data-section="${sectionName}"]`);
    console.log('Active link element:', activeLink);
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
        case 'permissions':
            loadPermissionsMatrix();
            break;
    }
}

// 테이블 헤더 클릭 이벤트 처리
function initTableSorting() {
    const headers = document.querySelectorAll('#usersTable th[data-sort]');
    headers.forEach(header => {
        header.addEventListener('click', () => {
            const field = header.dataset.sort;
            const currentOrder = header.dataset.order || 'asc';
            const newOrder = currentOrder === 'asc' ? 'desc' : 'asc';
            
            // 모든 헤더의 정렬 표시 초기화
            headers.forEach(h => {
                h.dataset.order = '';
                h.classList.remove('sorted-asc', 'sorted-desc');
            });

            // 클릭된 헤더의 정렬 표시 업데이트
            header.dataset.order = newOrder;
            header.classList.add(`sorted-${newOrder}`);

            loadUsers(field, newOrder, getCurrentFilters());
        });
    });
}

// 필터 적용
function getCurrentFilters() {
    const filters = {};
    document.querySelectorAll('.column-filter').forEach(filter => {
        filters[filter.dataset.field] = filter.value;
    });
    return filters;
}

// 필터 초기화
function initFilters() {
    document.querySelectorAll('.column-filter').forEach(filter => {
        filter.addEventListener('input', () => {
            loadUsers('no', 'asc', getCurrentFilters());
        });
    });
}


document.addEventListener('DOMContentLoaded', () => {
    console.log('DOM Content Loaded');

    // 메뉴 클릭 이벤트 리스너 추가
    const navLinks = document.querySelectorAll('.nav-link');
    console.log('Found nav links:', navLinks.length);  // 찾은 링크 수 확인
    
    navLinks.forEach(link => {
        console.log('Adding click listener to:', link.dataset.section);  // 각 링크의 섹션 확인
        link.addEventListener('click', (e) => {
            e.preventDefault();
            console.log('Nav link clicked:', e.currentTarget.dataset.section);  // 클릭 이벤트 확인
            const section = e.currentTarget.dataset.section;
            showSection(section);
        });
    });

    // 테이블 정렬과 필터 초기화
    initTableSorting();
    initFilters();

    // 초기 섹션 로드 (대시보드 개요)
    showSection('overview');
    loadStats();
    console.log('Loading initial section');
});