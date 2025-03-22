const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('certification');
});

module.exports = router;
