const axios = require("axios");
const dotenv = require("dotenv");
const cron = require('node-cron');
const express = require("express");
const cors = require("cors");
const { sendTotalMessage } = require('./sendTotalMessage');
const PQueue = require("p-queue").default; // Обратите внимание на .default
const { COUNTRY_FLAGS_MAP } = require('../constants/constants');
const { MongoClient } = require('mongodb'); // Импортируем MongoClient

dotenv.config();
let cachedDbClient = null;


// Подключение к базе данных

const app = express();

app.use(express.json());
app.use(cors());

let totalPayout = 0;
let messageCounter = 0;

const queue = new PQueue({ concurrency: 1, autoStart: true });

let dbClient;

const connectDB = async () => {
    try {
        if (cachedDbClient) {
            return cachedDbClient;
        }const client = new MongoClient(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true });
        await client.connect();
        console.log("MongoDB Connected...");
        cachedDbClient = client;
        return cachedDbClient;
    } catch (error) {
        console.error("Ошибка подключения к MongoDB:", error);
        throw new Error("Ошибка подключения к базе данных");
    }
};

// Функция для получения данных из базы
const getTotals = async () => {
    const db = dbClient.db("postbacks"); // Укажите название вашей базы данных
    const totals = await db.collection("totals").findOne({}); // Получаем один документ
    return totals || { totalPayout: 0, messageCounter: 0 }; // Возвращаем объект, если данных нет
};

// Функция для сохранения данных в базу
const saveTotals = async (totalPayout, messageCounter) => {
    const db = dbClient.db("postbacks"); // Укажите название вашей базы данных
    await db.collection("totals").updateOne({}, { $set: { totalPayout, messageCounter } }, { upsert: true }); // Обновляем или создаем документ
};

// Инициализация значений из базы данных при запуске сервера
const initializeTotals = async () => {
    const totals = await getTotals();
    totalPayout = totals.totalPayout;
    messageCounter = totals.messageCounter;
};

// Запускаем подключение к базе данных и инициализацию

connectDB().then(client => {
    dbClient = client;
    initializeTotals();
});

// Обработка POST-запроса
app.post("/keitaro-postback", (req, res) => {
    const { affiliate_network_name, revenue, subid, country } = req.query;

    // Добавляем обработку запроса в очередь
    const jobPromise = queue.add(async () => {
        messageCounter++;

        const payout = parseFloat(revenue) || 0;

        const message = `
${messageCounter}.  🔻 Status: ${COUNTRY_FLAGS_MAP[country]} DONE
      🔹 Lead ID: #${subid}
      🔹 AN: ${affiliate_network_name}
      💵 Payout: ${payout}
      💵 Total payout: ${payout + totalPayout}`;

        totalPayout += payout;

        await saveTotals(totalPayout, messageCounter); // Сохраняем в базу

        try {
            await axios.post(`https://api.telegram.org/bot${process.env.TELEGRAM_BOT_TOKEN}/sendMessage`, {
                chat_id: process.env.TELEGRAM_CHAT_ID,
                text: message,
                parse_mode: 'Markdown'
            });
            console.log(`Message sent: ${message}`); // Логируем успешную отправку
        } catch (error) {
            console.error("Ошибка при отправке в Telegram:", error);
            throw error; // Пробрасываем ошибку, чтобы она была поймана ниже
        }
    });

    // Обработка результата или ошибки из Promise
    jobPromise
        .then(() => {
            // Успешно добавлено в очередь
            res.send({ success: true, message: "Postback добавлен в очередь" });
        })
        .catch((error) => {
            // Обработка ошибки
            console.error("Ошибка при добавлении в очередь:", error);
            res.status(500).send({ success: false, message: "Ошибка при обработке запроса" });
        });
});

// Задача для очистки базы данных в полночь
cron.schedule('0 0 * * *', async () => {
    const db = dbClient.db("postbacks"); // Укажите название вашей базы данных
    await db.collection("totals").deleteMany({}); // Очищаем коллекцию
    totalPayout = 0; // Сбрасываем переменные
    messageCounter = 0;
    console.log("Database cleared and totals reset at midnight.");
}, { timezone: 'Europe/Kiev' });

app.get("/", (req, res) => res.send("Express ready on Vercel"));

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;
