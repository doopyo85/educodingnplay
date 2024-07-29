var mysql = require('mysql');
var db = mysql.createConnection({
    host: 'database-1.cte6iy2wqmcn.ap-northeast-2.rds.amazonaws.com',
    user: 'codingpioneer',
    password: 'fq84cod3',
    database: 'educodingnplay',
    connectTimeout: 10000,  // 추가
    acquireTimeout: 10000,  // 추가
    connectionLimit: 5,     // 추가
    queueLimit: 30          // 추가
});
db.connect(function(err) {
    if (err) {
        console.error('error connecting: ' + err.stack);
        return;
    }
    console.log('connected as id ' + db.threadId);
});

module.exports = db;
