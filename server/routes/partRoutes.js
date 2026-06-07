const express = require('express');
const router = express.Router();
const { addPart, getParts } = require('../controllers/partController');
const verifyToken = require('../middleware/authMiddleware'); // Guard middleware

// Protect all inventory modifications using verifyToken guard
router.post('/', verifyToken, addPart);
router.get('/', verifyToken, getParts);

module.exports = router;