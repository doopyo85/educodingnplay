const express = require('express');
const router = express.Router();

router.get('/', (req, res) => {
    res.render('metaverse');
});

module.exports = router;
