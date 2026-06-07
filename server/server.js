const express = require('express');
const cors = require('cors');
const db = require('./config/db'); // Just to initialize the connection
const authRoutes = require('./routes/authRoutes');
const categoryRoutes = require('./routes/categoryRoutes');
const partRoutes = require('./routes/partRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');

const app = express();

// Middleware
app.use(cors()); 
app.use(express.json()); 

// --- ROUTES ---
// Mount the auth routes. This prefixes all routes in authRoutes.js with /api/auth
app.use('/api/auth', authRoutes);
app.use('/api/categories', categoryRoutes);
app.use('/api/parts', partRoutes);
app.use('/api/dashboard', dashboardRoutes);

// Start the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});