const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

async function initializePool() {
  console.log('Initializing database pool...');
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
      connectTimeout: 20000 // 20초
    });
    console.log('Database pool created successfully');
  } catch (error) {
    console.error(' Failed to create database pool:', error);
    throw error;
  }
}

//  SQL 실행 함수 (디버깅 로그 추가)
async function queryDatabase(query, params = []) {
  if (!pool) {
    await initializePool();
  }
  try {
    console.log('Executing SQL:', query);
    console.log(' Params:', params);
    const [results] = await pool.query(query, params);
    console.log('SQL execution successful:', results);
    return results;
  } catch (error) {
    console.error(' Database query error:', { query, params, error });
    throw error;
  }
}

//  데이터베이스 연결 테스트
async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    const result = await queryDatabase('SELECT 1 as test');
    console.log('Database connection successful:', result);
  } catch (error) {
    console.error(' Database connection failed:', error);
  }
}

//  모듈이 로드될 때 자동으로 DB 풀 생성 및 연결 테스트 실행
(async () => {
  try {
    await initializePool();
    await testDatabaseConnection();
  } catch (error) {
    console.error(' Failed to initialize and test database connection:', error);
  }
})();

//  구독 상태 업데이트 함수
async function updateSubscriptionStatus(userID, status, expiryDate) {
  const query = `
      UPDATE Users
      SET subscription_status = ?, subscription_expiry = ?
      WHERE id = ?
  `;
  await queryDatabase(query, [status, expiryDate, userID]);
}

//  결제 내역 추가 함수
async function addPaymentRecord(userID, centerID, productName, amount, expiryDate) {
  const query = `
      INSERT INTO Payments (userID, centerID, product_name, payment_date, expiry_date, amount, status)
      VALUES (?, ?, ?, CURDATE(), ?, ?, 'active')
  `;
  await queryDatabase(query, [userID, centerID, productName, expiryDate, amount]);
}

module.exports = { updateSubscriptionStatus, addPaymentRecord, queryDatabase };
