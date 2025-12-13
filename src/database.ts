import mysql from "mysql2/promise";
 
// Create a MySQL pool
const pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || 'my-secret-pw',
    database: process.env.DB_NAME || 'webauthn_db',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0,
});
 
// Promisify for Node.js async/await.
export const promisePool = pool;
