const mysql = require('mysql');
require('dotenv').config();

async function testDatabaseConnection() {
    try {
      const result = await queryDatabase('SELECT 1');
      console.log('Database connection successful:', result);
    } catch (error) {
      console.error('Database connection failed:', error);
    }
  }
  
  testDatabaseConnection();


const pool = mysql.createPool({
    connectionLimit: 10,  // 최대 연결 수 설정
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    port: process.env.DB_PORT,
    connectTimeout: 10000,
    acquireTimeout: 10000,
    queueLimit: 30,
    debug: process.env.NODE_ENV !== 'production'
});

// MySQL 쿼리 실행 예시
function queryDatabase(query, params = []) {
    return new Promise((resolve, reject) => {
        pool.query(query, params, (error, results) => {
            if (error) {
                console.error('MySQL 쿼리 오류:', error);
                return reject(error);
            }
            resolve(results);
        });
    });
}

// 풀에서 연결을 획득하는 함수
function getConnection() {
    return new Promise((resolve, reject) => {
        pool.getConnection((err, connection) => {
            if (err) {
                console.error('MySQL 연결 오류:', err);
                return reject(err);
            }
            resolve(connection);
        });
    });
}

// MySQL 쿼리 예시
async function exampleQuery() {
    try {
        const results = await queryDatabase('SELECT * FROM Users WHERE id = ?', [1]);
        console.log(results);
    } catch (error) {
        console.error('쿼리 실행 오류:', error);
    }
}

// 초기화 함수 호출
exampleQuery();

// 모듈을 통해 pool을 내보냅니다.
module.exports = { queryDatabase, getConnection };
