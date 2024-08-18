var mysql = require('mysql');
var db;

function handleDisconnect() {
    db = mysql.createConnection({
        host: 'database-1.cte6iy2wqmcn.ap-northeast-2.rds.amazonaws.com',
        user: 'codingpioneer',
        password: 'fq84cod3',
        database: 'educodingnplay',
        connectTimeout: 10000,  // 추가
        acquireTimeout: 10000,  // 추가
        connectionLimit: 5,     // 추가
        queueLimit: 30,         // 추가
        debug: true             // 디버그 옵션 활성화
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