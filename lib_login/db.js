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
      connectTimeout: 20000 // 20 seconds
    });
    console.log('Pool created successfully');
  } catch (error) {
    console.error('Failed to create pool:', error);
    throw error;
  }
}

async function queryDatabase(query, params = []) {
  if (!pool) {
    await initializePool();
  }
  try {
    const [results] = await pool.query(query, params);
    return results;
  } catch (error) {
    console.error('Database query error:', { query, params, error });
    throw error;
  }
}

async function testDatabaseConnection() {
  try {
    console.log('Testing database connection...');
    const result = await queryDatabase('SELECT 1 as test');
    console.log('Database connection successful:', result);
  } catch (error) {
    console.error('Database connection failed:', error);
  }
}

// Initialize pool and test connection when this module is imported
(async () => {
  try {
    await initializePool();
    await testDatabaseConnection();
  } catch (error) {
    console.error('Failed to initialize and test database connection:', error);
  }
})();

async function updateSubscriptionStatus(userID, status, expiryDate) {
  const query = `
      UPDATE Users
      SET subscription_status = ?, subscription_expiry = ?
      WHERE id = ?
  `;
  await queryDatabase(query, [status, expiryDate, userID]);
}

async function addPaymentRecord(userID, centerID, productName, amount, expiryDate) {
  const query = `
      INSERT INTO Payments (userID, centerID, product_name, payment_date, expiry_date, amount, status)
      VALUES (?, ?, ?, CURDATE(), ?, ?, 'active')
  `;
  await queryDatabase(query, [userID, centerID, productName, expiryDate, amount]);
}

module.exports = { updateSubscriptionStatus, addPaymentRecord, queryDatabase };