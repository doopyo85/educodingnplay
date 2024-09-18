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
    console.error('Database query error:', error);
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

async function getUserByUserID(userID) {
  return await queryDatabase('SELECT * FROM Users WHERE userID = ?', [userID]);
}

async function createUser(userID, password, email, name, phone, birthdate, role, centerID) {
  return await queryDatabase(
      'INSERT INTO Users (userID, password, email, name, phone, birthdate, role, centerID) VALUES (?, ?, ?, ?, ?, ?, ?, ?)',
      [userID, password, email, name, phone, birthdate, role, centerID]
  );
}

module.exports = { queryDatabase, getUserByUserID, createUser };