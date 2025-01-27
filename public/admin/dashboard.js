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