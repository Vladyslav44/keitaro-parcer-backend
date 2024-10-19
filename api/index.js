const axios = require("axios");
const dotenv = require("dotenv");
const cron = require('node-cron');
const express = require("express");
const cors = require("cors");
const { sendTotalMessage } = require('./sendTotalMessage');
const { COUNTRY_FLAGS_MAP } = require('../constants/constants');


dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());

// const testPayout = 10;
// const country = 'PL';

let totalPayout = 0;
let messageCounter = 0;

app.post("/keitaro-postback", async (req, res) => {
    const { affiliate_network_name, revenue, subid, country } = req.query;

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

        res.send({ success: true, message: "Postback обработан и отправлен в Telegram" });
    } catch (error) {
        console.error("Ошибка при отправке в Telegram:", error);
        res.status(500).send({ success: false, message: "Не удалось отправить данные в Telegram" });
    }
});

cron.schedule('0 0 * * *', () => sendTotalMessage(messageCounter, totalPayout),
    { timezone: 'Europe/Kiev' }
);

app.get("/", (req, res) => res.send("Express ready on Vercel"));

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;

// setInterval(() => {
//     return sendTotalMessage(messageCounter, totalPayout);
// }, 30000);

// setInterval(sendToTelegram, 2500);

// const sendToTelegram = async () => {
//     messageCounter++;
//
//     const message = `
// ${String(`${messageCounter}.`).padEnd(3)}  🔻 Status: ${COUNTRY_FLAGS_MAP[country]} DONE
//       🔹 Lead ID: 1234
//       🔹 AN: #affiliate_network_name
//       💵 Payout: ${testPayout}
//       💵 Total payout: ${testPayout + totalPayout}`;
//
//     totalPayout += testPayout;
//
//     try {
//         await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
//             chat_id: process.env.TELEGRAM_CHAT_ID,
//             text: message,
//             parse_mode: 'Markdown'
//         });
//         console.log("Данные успешно отправлены в Telegram");
//     } catch (error) {
//         console.error("Ошибка при отправке в Telegram:", error);
//     }
// };
