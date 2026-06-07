const express = require('express');
const router = express.Router();
const { getDashboardData } = require('../controllers/dashboardController');
const verifyToken = require('../middleware/authMiddleware');

// Secure route to fetch dashboard metrics
router.get('/', verifyToken, getDashboardData);

module.exports = router;