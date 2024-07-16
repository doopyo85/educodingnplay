var mysql = require('mysql');
var db = mysql.createConnection({
    host: 'database-1.cte6iy2wqmcn.ap-northeast-2.rds.amazonaws.com',
    user: 'codingpioneer',
    password: 'fq84cod3',
    database: 'educodingnplay'
});
db.connect();

module.exports = db;
