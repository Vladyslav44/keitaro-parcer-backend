const axios = require("axios");
const dotenv = require("dotenv");
const cron = require('node-cron');
const express = require("express");
const cors = require("cors");

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());

// const testPayout = 10;

let messageCounter = 0;
let totalPayout = 0;

let messageQueue = []; // Массив для хранения задач
let isProcessing = false; // Флаг для отслеживания, обрабатывается ли очередь

const processQueue = async () => {
    // Если уже обрабатываем, выходим
    if (isProcessing || messageQueue.length === 0) {
        return;
    }

    isProcessing = true; // Устанавливаем флаг

    // Обрабатываем задачи из очереди
    while (messageQueue.length > 0) {
        const { payout, affiliate_network_name, status, subid } = messageQueue.shift(); // Получаем первую задачу из очереди

        messageCounter++;

        const message = `
${String(`${messageCounter}.`).padEnd(3)}  🔻 Status: ${status},
      🔹 Lead ID: #${subid}
      🔹 AN: ${affiliate_network_name}
      💵 Payout: ${payout}
      💵 Total payout: ${totalPayout}`;

        totalPayout += payout;

        try {
            await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            });
            console.log(`Сообщение отправлено: ${messageCounter}`);
        } catch (error) {
            console.error("Ошибка при отправке сообщения в Telegram:", error);
        }
    }

    isProcessing = false; // Сбрасываем флаг после обработки
};

app.post("/keitaro-postback", async (req, res) => {
    const { affiliate_network_name, status, revenue, subid } = req.query;
    const payout = parseFloat(revenue) || 0;

    // Добавляем задачу в очередь
    messageQueue.push({ payout, affiliate_network_name, status, subid });

    // Запускаем обработку очереди
    processQueue();

    res.send({ success: true, message: "Postback обработан и добавлен в очередь для отправки в Telegram" });
});

const sendTotalMessage = async () => {
    const totalMessage = `🔢 Total leads: ${messageCounter}\n💰 Total payout: ${totalPayout}`;

    try {
            await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: totalMessage,
                parse_mode: 'Markdown'
            });
            console.log(`Сообщение с общим количеством отправлено: ${messageCounter}`);
        } catch (error) {
            console.error("Ошибка при отправке итогового сообщения в Telegram:", error);
        }

    messageCounter = 0;
    totalPayout = 0;
};

cron.schedule('0 0 * * *', sendTotalMessage, {
    timezone: 'Europe/Kiev'
});
// setInterval(sendToTelegram, 2500);


app.get("/", (req, res) => res.send("Express ready on Vercel"));

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;

// const sendToTelegram = async () => {
//     messageCounter++;
//
//     const message = `
// ${String(`${messageCounter}.`).padEnd(3)}  🔻 Status: done,
//       🔹 Lead ID: 1234,
//       🔹 Campaign: #affiliate_network_name,
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

// app.post("/keitaro-postback", async (req, res) => {
//     const { affiliate_network_name, status, revenue, subid } = req.query;
//
//     messageCounter++;
//
//     const payout = parseFloat(revenue) || 0;
//
//     const message = `
// ${String(`${messageCounter}.`).padEnd(3)}  🔻 Status: ${status},
//       🔹 Lead ID: #${subid}
//       🔹 AN: ${affiliate_network_name}
//       💵 Payout: ${payout}
//       💵 Total payout: ${payout + totalPayout}`;
//
//     totalPayout += payout;
//
//     try {
//         await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
//             chat_id: process.env.TELEGRAM_CHAT_ID,
//             text: message,
//             parse_mode: 'Markdown'
//         });
//
//         res.send({ success: true, message: "Postback обработан и отправлен в Telegram" });
//     } catch (error) {
//         console.error("Ошибка при отправке в Telegram:", error);
//         res.status(500).send({ success: false, message: "Не удалось отправить данные в Telegram" });
//     }
// });
