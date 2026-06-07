const db = require('../config/db');

const addPart = async (req, res) => {
    // Sanitize and read fields
    const sku = req.body.sku?.trim().toUpperCase();
    const name = req.body.name?.trim();
    const category_id = parseInt(req.body.category_id);
    const brand = req.body.brand?.trim() || null;
    const compatible_models = req.body.compatible_models?.trim() || null;
    const stock_quantity = parseInt(req.body.stock_quantity) || 0;
    const price = parseFloat(req.body.price);

    if (!sku || !name || !category_id || isNaN(price)) {
        return res.status(400).json({ message: 'SKU, Name, Category, and valid Price are required.' });
    }

    if (stock_quantity < 0) {
        return res.status(400).json({ message: 'Stock quantity cannot be less than zero.' });
    }

    if (price < 0) {
        return res.status(400).json({ message: 'Price cannot be less than zero.' });
    }

    try {
        const [existingPart] = await db.query('SELECT id FROM parts WHERE sku = ?', [sku]);
        if (existingPart.length > 0) {
            return res.status(400).json({ message: `SKU '${sku}' already exists in inventory.` });
        }

        const [existingCategory] = await db.query('SELECT id FROM categories WHERE id = ?', [category_id]);
        if (existingCategory.length === 0) {
            return res.status(400).json({ message: 'Selected category does not exist.' });
        }

        const [result] = await db.query(
            'INSERT INTO parts (sku, name, category_id, brand, compatible_models, stock_quantity, price) VALUES (?, ?, ?, ?, ?, ?, ?)',
            [sku, name, category_id, brand, compatible_models, stock_quantity, price]
        );

        res.status(201).json({
            message: 'Motorcycle part added to inventory successfully!',
            partId: result.insertId
        });
    } catch (error) {
        console.error('Error adding motorcycle part:', error);
        res.status(500).json({ message: 'Server error while adding part to inventory.' });
    }
};

const getParts = async (req, res) => {
    try {
        // Fetch parts joined with category name for readability
        const [parts] = await db.query(`
            SELECT p.*, c.name AS category_name 
            FROM parts p 
            INNER JOIN categories c ON p.category_id = c.id 
            ORDER BY p.id DESC
        `);
        res.status(200).json(parts);
    } catch (error) {
        console.error('Error fetching inventory parts:', error);
        res.status(500).json({ message: 'Server error while fetching inventory list.' });
    }
};

const updatePart = async (req, res) => {
    const { id } = req.params;
    const sku = req.body.sku?.trim().toUpperCase();
    const name = req.body.name?.trim();
    const category_id = parseInt(req.body.category_id);
    const brand = req.body.brand?.trim() || null;
    const compatible_models = req.body.compatible_models?.trim() || null;
    const stock_quantity = parseInt(req.body.stock_quantity) || 0;
    const price = parseFloat(req.body.price);

    if (!sku || !name || !category_id || isNaN(price)) {
        return res.status(400).json({ message: 'SKU, Name, Category, and valid Price are required.' });
    }

    if (stock_quantity < 0 || price < 0) {
        return res.status(400).json({ message: 'Price and Stock quantity cannot be negative.' });
    }

    try {
        // Verify SKU is unique excluding the current part
        const [existingPart] = await db.query('SELECT id FROM parts WHERE sku = ? AND id != ?', [sku, id]);
        if (existingPart.length > 0) {
            return res.status(400).json({ message: `SKU '${sku}' is already allocated to another part.` });
        }

        const [result] = await db.query(
            'UPDATE parts SET sku = ?, name = ?, category_id = ?, brand = ?, compatible_models = ?, stock_quantity = ?, price = ? WHERE id = ?',
            [sku, name, category_id, brand, compatible_models, stock_quantity, price, id]
        );

        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Part specifications not found.' });
        }

        res.status(200).json({ message: 'Part details updated successfully!' });
    } catch (error) {
        console.error('Error updating part details:', error);
        res.status(500).json({ message: 'Server error while updating part.' });
    }
};

const deletePart = async (req, res) => {
    const { id } = req.params;
    try {
        const [result] = await db.query('DELETE FROM parts WHERE id = ?', [id]);
        if (result.affectedRows === 0) {
            return res.status(404).json({ message: 'Selected part not found.' });
        }
        res.status(200).json({ message: 'Part removed from inventory successfully.' });
    } catch (error) {
        console.error('Error deleting part:', error);
        res.status(500).json({ message: 'Server error while deleting part.' });
    }
};

module.exports = {
    addPart,
    getParts,
    updatePart,
    deletePart
};