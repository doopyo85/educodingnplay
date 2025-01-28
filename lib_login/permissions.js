// permissions.js
const ACCESS_POLICIES = {
    PAGES: {
        '/admin': ['admin'],
        '/kinder': ['admin', 'kinder'],
        '/school': ['admin', 'school'],
        '/teacher': ['admin', 'manager', 'teacher']
    },
    FEATURES: {
        'PPT_BUTTON': ['admin', 'teacher', 'manager', 'school'],
        'USER_MANAGE': ['admin'],
        'CONTENT_EDIT': ['admin', 'manager', 'teacher']
    }
};

function hasPageAccess(userRole, page) {
    return ACCESS_POLICIES.PAGES[page]?.includes(userRole) || false;
}

function hasFeatureAccess(userRole, feature) {
    return ACCESS_POLICIES.FEATURES[feature]?.includes(userRole) || false;
}

module.exports = {
    ACCESS_POLICIES,
    hasPageAccess,
    hasFeatureAccess
};