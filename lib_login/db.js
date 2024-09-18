const mysql = require('mysql2/promise');
require('dotenv').config();

let pool;

async function initializePool() {
  console.log('Initializing database pool...');
  console.log('DB_HOST:', process.env.DB_HOST);
  console.log('DB_USER:', process.env.DB_USER);
  console.log('DB_NAME:', process.env.DB_NAME);
  console.log('DB_PORT:', process.env.DB_PORT);

  pool = mysql.createPool({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    connectionLimit: 10,
    connectTimeout: 10000 // 10 seconds
  });
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

initializePool()
  .then(testDatabaseConnection)
  .catch(error => {
    console.error('Failed to initialize pool:', error);
  });

module.exports = { queryDatabase };