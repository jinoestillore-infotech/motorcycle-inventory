const express = require('express');
const router = express.Router();
const { addPart, getParts, updatePart, deletePart } = require('../controllers/partController');
const verifyToken = require('../middleware/authMiddleware'); // Guard middleware

// Protect all inventory modifications using verifyToken guard
router.post('/', verifyToken, addPart);
router.get('/', verifyToken, getParts);

router.put('/:id', verifyToken, updatePart);
router.delete('/:id', verifyToken, deletePart);

module.exports = router;