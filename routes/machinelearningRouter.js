const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('machinelearning');
});

module.exports = router;
