const axios = require("axios");
const dotenv = require("dotenv");
const cron = require('node-cron');
const express = require("express");
const cors = require("cors");
const { sendTotalMessage } = require('./sendTotalMessage');
const { COUNTRY_FLAGS_MAP } = require('../constants/constants');
const { sql } = require("@vercel/postgres");

dotenv.config();

async function createTable() {
    await sql`
        CREATE TABLE IF NOT EXISTS payout_data (
            id SERIAL PRIMARY KEY,
            total_payout FLOAT DEFAULT 0,
            message_counter INT DEFAULT 0
        );
    `;
}

// Вызовите функцию создания таблицы при старте приложения
createTable();

const app = express();

app.use(express.json());
app.use(cors());

// Функция для получения текущих значений totalPayout и messageCounter из базы данных
async function getCurrentTotals() {
    const result = await sql`SELECT total_payout, message_counter FROM payout_data ORDER BY id DESC LIMIT 1;`;
    return result.rows.length > 0 ? result.rows[0] : { total_payout: 0, message_counter: 0 };
}

let totalPayout = 0;
let messageCounter = 0;

// Получаем текущие значения из базы данных при старте сервера
getCurrentTotals().then(({ total_payout, message_counter }) => {
    totalPayout = total_payout;
    messageCounter = message_counter;
});

app.post("/keitaro-postback", async (req, res) => {
    const { affiliate_network_name, revenue, subid, country } = req.query;

    try {
        messageCounter++;

        const payout = parseFloat(revenue) || 0;
        totalPayout += payout;

        const message = `
${messageCounter}.  🔻 Status: ${COUNTRY_FLAGS_MAP[country]} SEND
      🔹 Lead ID: #${subid}
      🔹 AN: ${affiliate_network_name}
      💵 Payout: ${payout}
      💵 Total payout: ${totalPayout}`;

        // Сохраняем значения в базе данных
        await sql`
            INSERT INTO payout_data (total_payout, message_counter)
            VALUES (${totalPayout}, ${messageCounter});
        `;

        await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: message,
            parse_mode: 'Markdown'
        });

        console.log(`Message sent: ${message}`);
        res.send({ success: true, message: "Postback обработан" });
    } catch (error) {
        console.error("Ошибка при обработке запроса:", error);
        res.status(500).send({ success: false, message: "Ошибка при обработке запроса" });
    }
});

cron.schedule('0 0 * * *', async () => {
    sendTotalMessage(messageCounter, totalPayout);
    await sql`DELETE FROM payout_data;`; // Очищаем базу данных
    totalPayout = 0; // Сбрасываем локальные переменные
    messageCounter = 0;
    console.log("Database cleared and totals reset at midnight.");
}, { timezone: 'Europe/Kiev' });

app.get("/", (req, res) => res.send("Express ready on Vercel"));

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;
