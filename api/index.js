const axios = require("axios");
const dotenv = require("dotenv");
const cron = require('node-cron');
const express = require("express");
const cors = require("cors");
const { sendTotalMessage } = require('./sendTotalMessage');
const PQueue = require("p-queue").default;
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

    const jobPromise = queue.add(async () => {
        messageCounter++;

        const payout = parseFloat(revenue) || 0;

        const message = `
${messageCounter}.  🔻 Status: ${COUNTRY_FLAGS_MAP[country]} SEND
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
            console.log(`Message sent: ${message}`);
        } catch (error) {
            console.error("Ошибка при отправке в Telegram:", error);
            throw error;
        }
    });

    jobPromise
        .then(() => {
            res.send({ success: true, message: "Postback добавлен в очередь" });
        })
        .catch((error) => {
            console.error("Ошибка при добавлении в очередь:", error);
            res.status(500).send({ success: false, message: "Ошибка при обработке запроса" });
        });
});

cron.schedule('0 0 * * *', async () => {
    sendTotalMessage(messageCounter, totalPayout);
    totalPayout = 0; // Сбрасываем переменные
    messageCounter = 0;
    console.log("Database cleared and totals reset at midnight.");
}, { timezone: 'Europe/Kiev' });

app.get("/", (req, res) => res.send("Express ready on Vercel"));

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;
