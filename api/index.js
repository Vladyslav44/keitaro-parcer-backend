const axios = require("axios");
const dotenv = require("dotenv");
const cron = require('node-cron');
const PQueue = require("p-queue").default;
const express = require("express");
const { sendTotalMessage } = require('./sendTotalMessage');
const cors = require("cors");
const { getCurrentTotals, createTable } = require('./database');
const { COUNTRY_FLAGS_MAP } = require('../constants/constants');
const { sql } = require("@vercel/postgres");

const app = express();
dotenv.config();
app.use(express.json());
app.use(cors());
createTable();

const queue = new PQueue({ concurrency: 1, autoStart: true });

let totalPayout = 0;
let messageCounter = 0;

getCurrentTotals().then(({ total_payout, message_counter }) => {
    totalPayout = total_payout;
    messageCounter = message_counter;
});

app.post("/keitaro-postback", async (req, res) => {
    const {
        subid,
        revenue,
        country,
        affiliate_network_name
    } = req.query;

    const jobPromise = queue.add(async () => {
        messageCounter++;
        const payout = parseFloat(revenue) || 0;

        const message = `
${messageCounter}.  🔻 Status: ${COUNTRY_FLAGS_MAP[country]} SEND
      🔹 Lead ID: #${subid}
      🔹 AN: ${affiliate_network_name}
      💵 Payout: ${payout}
      💵 Total payout: ${totalPayout}`;

        totalPayout += payout;

        await sql`
            INSERT INTO payout_data (total_payout, message_counter)
            VALUES (${totalPayout}, ${messageCounter});
        `;

        try {
            await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            });
        } catch (error) {
            throw new Error("Error sending message to Telegram");
        }
    });

    try {
        await jobPromise;
        res.send({ success: true, message: "Postback added to queue" });
    } catch (error) {
        res.status(500).send({ success: false, message: "Error processing request" });
    }
});

cron.schedule('0 0 * * *', async () => {
    sendTotalMessage(messageCounter, totalPayout);
    // clear db
    await sql`DELETE FROM payout_data;`;
    totalPayout = 0;
    messageCounter = 0;
    console.log("Database cleared and totals reset at midnight.");
}, { timezone: 'Europe/Kiev' });

app.get("/", (req, res) => res.send("Express ready on Vercel"));

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;
