const db = require('../config/db');

const getDashboardData = async (req, res) => {
    try {
        // Run database aggregation queries in parallel
        const [
            [partsCount],
            [categoriesCount],
            [lowStockCount],
            [inventoryValue],
            lowStockItems
        ] = await Promise.all([
            db.query('SELECT COUNT(*) AS total_parts FROM parts'),
            db.query('SELECT COUNT(*) AS total_categories FROM categories'),
            db.query('SELECT COUNT(*) AS low_stock_count FROM parts WHERE stock_quantity <= 5'),
            db.query('SELECT SUM(stock_quantity * price) AS total_value FROM parts'),
            db.query(`
                SELECT p.*, c.name AS category_name 
                FROM parts p 
                INNER JOIN categories c ON p.category_id = c.id 
                WHERE p.stock_quantity <= 5 
                ORDER BY p.stock_quantity ASC 
                LIMIT 5
            `)
        ]);

        res.status(200).json({
            totalParts: partsCount[0].total_parts || 0,
            totalCategories: categoriesCount[0].total_categories || 0,
            lowStockAlerts: lowStockCount[0].low_stock_count || 0,
            inventoryValue: parseFloat(inventoryValue[0].total_value || 0).toFixed(2),
            lowStockItems: lowStockItems[0] // Extract database result rows
        });
    } catch (error) {
        console.error('Error compiling dashboard metrics:', error);
        res.status(500).json({ message: 'Server error while compiling dashboard metrics.' });
    }
};

module.exports = {
    getDashboardData
};