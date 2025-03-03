const express = require('express');
const router = express.Router();

// 개별 라우트 불러오기
const authRouter = require('../lib_login/auth');
const adminRouter = require('./admin');
const boardRouter = require('./board');
const entryRouter = require('./entryRouter');
const kinderRouter = require('./kinder');
const learningRouter = require('./learning');
const machinelearningRouter = require('./machinelearningRouter');
const metaverseRouter = require('./metaverseRouter');
const onlineclassRouter = require('./onlineclassRouter');
const preschoolRouter = require('./preschoolRouter');

// 라우트 등록
router.use('/auth', authRouter);
router.use('/admin', adminRouter);
router.use('/board', boardRouter);
router.use('/entry', entryRouter);
router.use('/kinder', kinderRouter);
router.use('/learning', learningRouter);
router.use('/machinelearning', machinelearningRouter);
router.use('/metaverse', metaverseRouter);
router.use('/onlineclass', onlineclassRouter);
router.use('/preschool', preschoolRouter);

module.exports = router;
