const mysql = require('mysql2/promise');
require('dotenv').config();

let pool = null;

async function initializePool() {
    // 이미 풀이 존재하면 기존 풀 반환
    if (pool) {
        console.log('Using existing database pool');
        return pool;
    }

    console.log('Creating new database pool...');
    console.log('DB_HOST:', process.env.DB_HOST);
    console.log('DB_USER:', process.env.DB_USER);
    console.log('DB_NAME:', process.env.DB_NAME);
    console.log('DB_PORT:', process.env.DB_PORT);

    try {
        pool = await mysql.createPool({
            host: process.env.DB_HOST,
            user: process.env.DB_USER,
            password: process.env.DB_PASSWORD,
            database: process.env.DB_NAME,
            port: process.env.DB_PORT,
            connectionLimit: 10,
            connectTimeout: 20000, // 20초
            waitForConnections: true,
            queueLimit: 0
        });

        // 풀 이벤트 핸들러 추가
        pool.on('connection', () => {
            console.log('New connection established in the pool');
        });

        pool.on('error', (err) => {
            console.error('Database pool error:', err);
        });

        console.log('Database pool created successfully');
        return pool;
    } catch (error) {
        console.error('Failed to create database pool:', error);
        throw error;
    }
}

async function queryDatabase(query, params = []) {
    try {
        // 풀이 없으면 초기화
        if (!pool) {
            await initializePool();
        }

        // 쿼리 실행 전 로깅
        console.log('Executing SQL:', {
            query,
            params,
            timestamp: new Date().toISOString()
        });

        const [results] = await pool.execute(query, params);
        
        // 성공 로깅
        console.log('Query executed successfully:', {
            rowCount: results.length,
            timestamp: new Date().toISOString()
        });

        return results;
    } catch (error) {
        console.error('Database query error:', {
            query,
            params,
            error: error.message,
            timestamp: new Date().toISOString()
        });
        throw error;
    }
}

async function testDatabaseConnection() {
    try {
        console.log('Testing database connection...');
        const result = await queryDatabase('SELECT 1 as test');
        console.log('Database connection test successful');
        return true;
    } catch (error) {
        console.error('Database connection test failed:', error);
        return false;
    }
}

// 구독 상태 업데이트 함수
async function updateSubscriptionStatus(userID, status, expiryDate) {
    const query = `
        UPDATE Users
        SET subscription_status = ?, 
            subscription_expiry = ?,
            updated_at = CURRENT_TIMESTAMP
        WHERE id = ?
    `;
    try {
        await queryDatabase(query, [status, expiryDate, userID]);
        console.log(`Successfully updated subscription for user ${userID}`);
    } catch (error) {
        console.error(`Failed to update subscription for user ${userID}:`, error);
        throw error;
    }
}

// 결제 내역 추가 함수
async function addPaymentRecord(userID, centerID, productName, amount, expiryDate) {
    const query = `
        INSERT INTO Payments (
            userID, 
            centerID, 
            product_name, 
            payment_date, 
            expiry_date, 
            amount, 
            status,
            created_at
        ) VALUES (?, ?, ?, CURRENT_TIMESTAMP, ?, ?, 'active', CURRENT_TIMESTAMP)
    `;
    try {
        await queryDatabase(query, [userID, centerID, productName, expiryDate, amount]);
        console.log(`Successfully added payment record for user ${userID}`);
    } catch (error) {
        console.error(`Failed to add payment record for user ${userID}:`, error);
        throw error;
    }
}

// 초기 데이터베이스 연결 설정
(async () => {
    try {
        await initializePool();
        const isConnected = await testDatabaseConnection();
        if (isConnected) {
            console.log('Database initialization completed successfully');
        } else {
            console.error('Database initialization failed');
        }
    } catch (error) {
        console.error('Failed to initialize database:', error);
        process.exit(1); // 심각한 에러시 프로세스 종료
    }
})();

module.exports = {
    queryDatabase,
    updateSubscriptionStatus,
    addPaymentRecord,
    testDatabaseConnection
};