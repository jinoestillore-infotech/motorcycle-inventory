const mysql = require('mysql2');

// Configure the connection to your XAMPP MySQL database
const pool = mysql.createPool({
    host: 'localhost',
    user: 'root',         // Default XAMPP username
    password: '',         // Default XAMPP password is empty
    database: 'moto_inventory',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// We use promises so we can use async/await in our server routes
const promisePool = pool.promise();

// Test the connection
promisePool.getConnection()
    .then(connection => {
        console.log('Successfully connected to the XAMPP MySQL database.');
        connection.release();
    })
    .catch(err => {
        console.error('Error connecting to MySQL:', err.message);
    });

module.exports = promisePool;