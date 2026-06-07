const express = require('express');
const router = express.Router();
const { addCategory, getCategories } = require('../controllers/categoryController');
const verifyToken = require('../middleware/authMiddleware'); // Import our security guard

// Notice how we put 'verifyToken' in the middle. 
// The request must pass the guard before reaching the controller.
router.post('/', verifyToken, addCategory);
router.get('/', verifyToken, getCategories);

module.exports = router;