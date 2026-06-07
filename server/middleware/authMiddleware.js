const jwt = require('jsonwebtoken');

const JWT_SECRET = process.env.JWT_SECRET || 'moto_inventory_super_secret_key_123';

const verifyToken = (req, res, next) => {
    // Get the token from the header (usually sent as "Bearer [token]")
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
        return res.status(401).json({ message: 'Access denied. No token provided.' });
    }

    try {
        // Verify the token
        const decoded = jwt.verify(token, JWT_SECRET);
        req.user = decoded; // Attach the user data (id, email) to the request
        next(); // Let the user pass to the actual controller
    } catch (error) {
        return res.status(403).json({ message: 'Invalid or expired token.' });
    }
};

module.exports = verifyToken;