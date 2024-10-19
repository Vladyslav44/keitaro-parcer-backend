const axios = require('axios');

const sendTotalMessage = async (messageCounter, totalPayout) => {
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
};

module.exports = { sendTotalMessage };
