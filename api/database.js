const { sql } = require("@vercel/postgres");

async function createTable() {
    await sql`
        CREATE TABLE IF NOT EXISTS payout_data (
            id SERIAL PRIMARY KEY,
            total_payout FLOAT DEFAULT 0,
            message_counter INT DEFAULT 0
        );
    `;
}

async function getCurrentTotals() {
    const result = await sql`SELECT total_payout, message_counter FROM payout_data ORDER BY id DESC LIMIT 1;`;
    return result.rows.length > 0 ? result.rows[0] : { total_payout: 0, message_counter: 0 };
}

module.exports = {
    createTable,
    getCurrentTotals
};
