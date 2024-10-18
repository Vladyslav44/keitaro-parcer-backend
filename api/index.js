const axios = require("axios");
const dotenv = require("dotenv");
const express = require("express");
const cors = require("cors");

dotenv.config();

const app = express();

app.use(express.json());
app.use(cors());
app.post("/keitaro-postback", async (req, res) => {
    const data = req.body;
    console.log("Полученные данные от Keitaro:", data);

    const message = `Полученные данные от Keitaro:\n${JSON.stringify(data, null, 2)}`;

    try {
        await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: process.env.TELEGRAM_CHAT_ID,
            text: message,
        });

        res.send({ success: true, message: "Postback обработан и отправлен в Telegram" });
    } catch (error) {
        console.error("Ошибка при отправке в Telegram:", error);
        res.status(500).send({ success: false, message: "Не удалось отправить данные в Telegram" });
    }
});

app.get("/", (req, res) => res.send("Express ready on Vercel"));

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;
