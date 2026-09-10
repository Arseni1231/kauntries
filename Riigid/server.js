const express = require("express");
const cors = require("cors");
const admin = require('firebase-admin');

const app = express();

app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true
}));

app.use(express.json());

async function startServer() {
    try {
        // 1. Инициализация подключения к вашей Firebase
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });

        const db = admin.database();
        console.log("Успешно подключено к Firebase!");

        // 2. ГЛАВНАЯ СТРАНИЦА: Выводим всё, что есть в Firebase, прямо на экран
        app.get("/", async (req, res) => {
            try {
                // Читаем абсолютно всё из корня вашей базы данных
                const ref = db.ref("/");
                const snapshot = await ref.once("value");
                const allData = snapshot.val();

                // Отправляем данные в браузер в красивом, читаемом текстовом формате
                res.setHeader("Content-Type", "application/json; charset=utf-8");
                res.send(JSON.stringify(allData, null, 2));

            } catch (error) {
                res.status(500).send("Ошибка получения данных из Firebase: " + error.message);
            }
        });

        // Запуск сервера на порту, который требует Render
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Сервер запущен на порту: ${PORT}`);
        });

    } catch (err) {
        console.error("Критическая ошибка запуска:", err.message);
    }
}

startServer();