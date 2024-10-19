const axios = require("axios");
const dotenv = require("dotenv");
const cron = require('node-cron');
const express = require("express");
const cors = require("cors");
const PQueue = require('p-queue').default;
const queue = new PQueue({ concurrency: 1 });

dotenv.config();
const app = express();

app.use(express.json());
app.use(cors());

// const testPayout = 10;

let messageCounter = 0;
let totalPayout = 0;

app.post("/keitaro-postback", async (req, res) => {
    const { affiliate_network_name, status, revenue, subid } = req.query;

    queue.add(async () => {
        messageCounter++;
        const payout = parseFloat(revenue) || 0;

        const message = `
${String(`${messageCounter}.`).padEnd(3)}  🔻 Status: ${status},
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

            return { success: true, message: "Postback обработан и отправлен в Telegram" };
        } catch (error) {
            console.error("Ошибка при отправке в Telegram:", error);
            throw new Error("Не удалось отправить данные в Telegram");
        }
    })
        .then(result => {
            res.send(result);
        })
        .catch(error => {
            res.status(500).send({ success: false, message: error.message });
        });
});

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
