const express = require('express');
const router = express.Router();
const { addCategory, getCategories, updateCategory, deleteCategory } = require('../controllers/categoryController');
const verifyToken = require('../middleware/authMiddleware'); // Import our security guard

// Notice how we put 'verifyToken' in the middle. 
// The request must pass the guard before reaching the controller.
router.post('/', verifyToken, addCategory);
router.get('/', verifyToken, getCategories);

router.put('/:id', verifyToken, updateCategory);
router.delete('/:id', verifyToken, deleteCategory);

module.exports = router;