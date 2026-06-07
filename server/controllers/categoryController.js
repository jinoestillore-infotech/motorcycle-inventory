const db = require('../config/db');

// Add a new category
const addCategory = async (req, res) => {
    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Category name is required.' });
    }

    try {
        const [result] = await db.query(
            'INSERT INTO categories (name, description) VALUES (?, ?)',
            [name, description || null]
        );

        res.status(201).json({ 
            message: 'Category added successfully!', 
            categoryId: result.insertId 
        });
    } catch (error) {
        console.error('Error adding category:', error);
        res.status(500).json({ message: 'Server error while adding category.' });
    }
};

// Get all categories (We will need this for the "Add Part" dropdown later!)
const getCategories = async (req, res) => {
    try {
        const [categories] = await db.query('SELECT * FROM categories ORDER BY name ASC');
        res.status(200).json(categories);
    } catch (error) {
        console.error('Error fetching categories:', error);
        res.status(500).json({ message: 'Server error while fetching categories.' });
    }
};

module.exports = {
    addCategory,
    getCategories
};