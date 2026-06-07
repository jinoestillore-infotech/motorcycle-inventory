const express = require('express');
const router = express.Router();
const { createTransaction } = require('../controllers/transactionController');
const verifyToken = require('../middleware/authMiddleware');

// Lock transactions behind active token verifications
router.post('/', verifyToken, createTransaction);

module.exports = router;