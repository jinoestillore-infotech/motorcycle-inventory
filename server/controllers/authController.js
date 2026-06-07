const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken'); 
const db = require('../config/db');

// In a real app, keep this secret in a .env file!
const JWT_SECRET = process.env.JWT_SECRET || 'moto_inventory_super_secret_key_123';

// Helper function to validate email format
const isValidEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
};

// --- REGISTER LOGIC ---
const registerUser = async (req, res) => {
    try {
        // 1. Sanitize Inputs (remove extra spaces, lowercase email)
        const name = req.body.name?.trim();
        const email = req.body.email?.trim().toLowerCase();
        const password = req.body.password;

        // 2. Validate Inputs
        if (!name || !email || !password) {
            return res.status(400).json({ message: 'All fields are required.' });
        }
        if (!isValidEmail(email)) {
            return res.status(400).json({ message: 'Invalid email format.' });
        }
        if (password.length < 8) {
            return res.status(400).json({ message: 'Password must be at least 8 characters long.' });
        }

        // 3. Check if user exists
        const [existingUsers] = await db.query('SELECT id FROM users WHERE email = ?', [email]);
        if (existingUsers.length > 0) {
            return res.status(400).json({ message: 'Email is already registered.' });
        }

        // 4. Hash password (12 rounds is the modern standard)
        const hashedPassword = await bcrypt.hash(password, 12);

        // 5. Save to database
        const [result] = await db.query(
            'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
            [name, email, hashedPassword]
        );

        // 6. Generate a secure JWT Token (expires in 8 hours)
        const token = jwt.sign(
            { id: result.insertId, email: email },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // 7. Send success response WITH the token
        res.status(201).json({ 
            message: 'User registered successfully!', 
            token, // Frontend will save this to localStorage
            user: { id: result.insertId, name, email } 
        });

    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
};

// --- LOGIN LOGIC ---
const loginUser = async (req, res) => {
    try {
        // 1. Sanitize Inputs
        const email = req.body.email?.trim().toLowerCase();
        const password = req.body.password;

        if (!email || !password) {
            return res.status(400).json({ message: 'Email and password are required.' });
        }

        // 2. Fetch user from database
        const [users] = await db.query('SELECT * FROM users WHERE email = ?', [email]);
        
        // Anti-Enumeration: We use the exact same error for "user not found" and "wrong password"
        if (users.length === 0) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        const user = users[0];

        // 3. Verify Password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ message: 'Invalid email or password.' });
        }

        // 4. Generate JWT Token
        const token = jwt.sign(
            { id: user.id, email: user.email },
            JWT_SECRET,
            { expiresIn: '8h' }
        );

        // 5. Send success response WITH the token
        res.status(200).json({ 
            message: 'Login successful!', 
            token, // Frontend will save this to localStorage
            user: { id: user.id, name: user.name, email: user.email } 
        });

    } catch (error) {
        console.error('Login error:', error);
        res.status(500).json({ message: 'An internal server error occurred.' });
    }
};

module.exports = {
    registerUser,
    loginUser
};