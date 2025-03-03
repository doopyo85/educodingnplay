const express = require('express');
const router = express.Router();
const { exec } = require('child_process');
const fs = require('fs');

// 파이썬 코드 실행 API
router.post('/run-python', (req, res) => {
    const userCode = req.body.code;
    const path = './temp.py';

    fs.writeFileSync(path, userCode);

    exec(`python3 ${path}`, (error, stdout, stderr) => {
        if (error) return res.json({ output: `Error: ${error.message}` });
        if (stderr) return res.json({ output: `stderr: ${stderr}` });

        res.json({ output: stdout });
    });
});

module.exports = router;
