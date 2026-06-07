const db = require('../config/db');

// Process checkout, deduct stock quantities, and record sales logs
const createTransaction = async (req, res) => {
    const { items, amountPaid } = req.body; // items: [{ part_id, quantity }]

    if (!items || !items.length || isNaN(amountPaid)) {
        return res.status(400).json({ message: 'A valid items array and payment amount are required.' });
    }

    // Acquire a single dedicated pool connection to secure transactional boundaries
    const connection = await db.getConnection();
    try {
        await connection.beginTransaction();

        let totalAmount = 0;
        const itemsToInsert = [];

        // Loop through each cart item to verify active database records and stock levels
        for (const item of items) {
            const [parts] = await connection.query(
                'SELECT id, name, price, stock_quantity FROM parts WHERE id = ?',
                [item.part_id]
            );

            if (parts.length === 0) {
                throw new Error(`Product reference ID ${item.part_id} does not exist in inventory.`);
            }

            const part = parts[0];
            if (part.stock_quantity < item.quantity) {
                throw new Error(`Insufficient stock for "${part.name}". Only ${part.stock_quantity} unit(s) left.`);
            }

            // Accumulate financial aggregates
            const itemTotal = parseFloat(part.price) * parseInt(item.quantity);
            totalAmount += itemTotal;

            itemsToInsert.push({
                part_id: part.id,
                quantity: parseInt(item.quantity),
                price: part.price
            });
        }

        if (amountPaid < totalAmount) {
            throw new Error(`Insufficient payment. Total due is $${totalAmount.toFixed(2)}, but only received $${parseFloat(amountPaid).toFixed(2)}.`);
        }

        const changeAmount = amountPaid - totalAmount;

        const [txResult] = await connection.query(
            'INSERT INTO transactions (total_amount, amount_paid, change_amount) VALUES (?, ?, ?)',
            [totalAmount, amountPaid, changeAmount]
        );
        const transactionId = txResult.insertId;

        for (const item of itemsToInsert) {
            // Save log record line
            await connection.query(
                'INSERT INTO transaction_items (transaction_id, part_id, quantity, price_at_sale) VALUES (?, ?, ?, ?)',
                [transactionId, item.part_id, item.quantity, item.price]
            );

            // Deduct from physical parts count
            await connection.query(
                'UPDATE parts SET stock_quantity = stock_quantity - ? WHERE id = ?',
                [item.quantity, item.part_id]
            );
        }

        // Commit all SQL updates simultaneously if everything succeeded
        await connection.commit();

        res.status(201).json({
            message: 'Transaction completed successfully!',
            transactionId,
            totalAmount: totalAmount.toFixed(2),
            changeAmount: changeAmount.toFixed(2)
        });

    } catch (error) {
        await connection.rollback();
        console.error('Checkout failed, restoring inventory state:', error.message);
        res.status(400).json({ message: error.message || 'Unable to process transactional operations.' });
    } finally {
        // Return connection back to pooling thread
        connection.release();
    }
};

module.exports = {
    createTransaction
};