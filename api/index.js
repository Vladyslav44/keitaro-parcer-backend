const axios = require("axios");
const dotenv = require("dotenv");
const cron = require('node-cron');
const express = require("express");
const cors = require("cors");
const { sendTotalMessage } = require('./sendTotalMessage');
let PQueue;
(async () => {
    PQueue = (await import('p-queue')).default; // Используем ESM импорт
})();
const { COUNTRY_FLAGS_MAP } = require('../constants/constants');

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());

let totalPayout = 0;
let messageCounter = 0;

const queue = new PQueue({ concurrency: 1, autoStart: true });

app.post("/keitaro-postback", (req, res) => {
    const { affiliate_network_name, revenue, subid, country } = req.query;

    // Добавляем обработку запроса в очередь
    queue.add(async () => {
        messageCounter++;

        const payout = parseFloat(revenue) || 0;

        const message = `
${messageCounter}.  🔻 Status: ${COUNTRY_FLAGS_MAP[country]} DONE
      🔹 Lead ID: #${subid}
      🔹 AN: ${affiliate_network_name}
      💵 Payout: ${payout}
      💵 Total payout: ${payout + totalPayout}`;

        totalPayout += payout;

        try {
            await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            });
            console.log(`Message sent: ${message}`); // Логируем успешную отправку
        } catch (error) {
            console.error("Ошибка при отправке в Telegram:", error);
        }
    });

    // Отправляем ответ сразу после добавления в очередь
    res.send({ success: true, message: "Postback добавлен в очередь" });
});

cron.schedule('0 0 * * *', () => sendTotalMessage(messageCounter, totalPayout), { timezone: 'Europe/Kiev' });

app.get("/", (req, res) => res.send("Express ready on Vercel"));

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;
