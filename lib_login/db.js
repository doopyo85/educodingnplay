const mysql = require('mysql');
require('dotenv').config();

let db;

function handleDisconnect() {
    db = mysql.createConnection({
        host: process.env.DB_HOST,
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME,
        port: process.env.DB_PORT,
        connectTimeout: 10000,
        acquireTimeout: 10000,
        connectionLimit: 5,
        queueLimit: 30,
        debug: process.env.NODE_ENV !== 'production'
    });

    db.connect(function(err) {
        if (err) {
            console.error('error connecting: ' + err.stack);
            setTimeout(handleDisconnect, 2000);
            return;
        }
        console.log('connected as id ' + db.threadId);
    });

    db.on('error', function(err) {
        console.error('db error', err);
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            handleDisconnect();
        } else {
            throw err;
        }
    });
}

// 초기 연결 시도
handleDisconnect();

module.exports = db;