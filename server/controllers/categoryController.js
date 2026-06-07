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

// Update category details by ID
const updateCategory = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;

    if (!name) {
        return res.status(400).json({ message: 'Category name is required.' });
    }

    try {
        const [result] = await db.query(
            'UPDATE categories SET name = ?, description = ? WHERE id = ?',
            [name, description || null, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Category not found.' });
        }

        res.status(200).json({ message: 'Category updated successfully!' });
    } catch (error) {
        console.error('Error updating category:', error);
        res.status(500).json({ message: 'Server error while updating category.' });
    }
};

// Delete category securely by ID
const deleteCategory = async (req, res) => {
    const { id } = req.params;

    try {
        const [result] = await db.query('DELETE FROM categories WHERE id = ?', [id]);

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Category not found.' });
        }

        res.status(200).json({ message: 'Category deleted successfully!' });
    } catch (error) {
        console.error('Error deleting category:', error);
        // Handle foreign key constraint error (typically errno 1451)
        if (error.errno === 1451) {
            return res.status(400).json({ 
                message: 'Cannot delete category. There are parts currently belonging to this category.' 
            });
        }
        res.status(500).json({ message: 'Server error while deleting category.' });
    }
};

module.exports = {
    addCategory,
    getCategories,
    updateCategory,
    deleteCategory
};