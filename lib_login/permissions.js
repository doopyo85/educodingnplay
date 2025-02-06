// permissions.js
const ACCESS_POLICIES = {
    PAGES: {
        '/admin': {
            name: '관리자 대시보드',
            roles: ['admin']
        },
        '/kinder': {
            name: '유치원',
            roles: ['admin', 'kinder']
        },
        '/school': {
            name: '학교',
            roles: ['admin', 'school']
        },
        '/computer': {
            name: '컴퓨터 학습',
            roles: ['admin', 'manager', 'teacher', 'student']
        },
        '/scratch_project': {
            name: '스크래치',
            roles: ['admin', 'manager', 'teacher', 'student']
        },
        '/entry_project': {
            name: '엔트리',
            roles: ['admin', 'manager', 'teacher', 'student']
        },
        '/python': {
            name: '파이썬',
            roles: ['admin', 'manager', 'teacher']
        }
    },
    FEATURES: {
        'PPT_BUTTON': ['admin', 'teacher', 'manager', 'school'],
        'USER_MANAGE': ['admin'],
        'CONTENT_EDIT': ['admin', 'manager', 'teacher']
    }
};

// 권한 캐시
const permissionCache = new Map();

// 권한 캐시 업데이트
function updatePermissionCache(newPermissions) {
    permissionCache.clear();
    Object.entries(newPermissions.pages).forEach(([page, config]) => {
        permissionCache.set(page, config.roles);
    });
}

// 페이지 접근 권한 확인
function hasPageAccess(userRole, page) {
    const pageConfig = ACCESS_POLICIES.PAGES[page];
    return pageConfig?.roles.includes(userRole) || false;
}

// 특정 기능에 대한 접근 권한 확인
function hasFeatureAccess(userRole, feature) {
    return ACCESS_POLICIES.FEATURES[feature]?.includes(userRole) || false;
}

// 접근 권한 확인 (캐시 사용)
function hasAccess(userRole, page) {
    const roles = permissionCache.get(page);
    return roles?.includes(userRole) || false;
}

module.exports = {
    ACCESS_POLICIES,
    updatePermissionCache,
    hasPageAccess,
    hasFeatureAccess,
    hasAccess
};