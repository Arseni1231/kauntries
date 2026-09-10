const express = require("express");
const bcrypt = require("bcrypt");
const cors = require("cors");
const admin = require('firebase-admin'); // Перенесли импорт наверх

const app = express();

app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true
}));

app.use(express.json());
app.use("/flags", express.static("public/flags"));

async function startServer() {
    try {
        // 1. ИНИЦИАЛИЗАЦИЯ FIREBASE (Вместо старого mysql.createPool)
        const serviceAccount = JSON.parse(process.env.FIREBASE_SERVICE_ACCOUNT);

        admin.initializeApp({
            credential: admin.credential.cert(serviceAccount),
            databaseURL: process.env.FIREBASE_DATABASE_URL
        });

        const db = admin.database();
        console.log("Успешное подключение к Firebase Realtime Database!");

        // ==========================================
        // 2. МАРШРУТЫ ПРИЛОЖЕНИЯ
        // ==========================================

        // РЕГИСТРАЦИЯ ПОЛЬЗОВАТЕЛЯ
        app.post("/register", async (req, res) => {
            try {
                const { username, email, password } = req.body;
                if (!username || !email || !password) {
                    return res.json({ success: false, message: "Все поля обязательны" });
                }

                // В Firebase мы проверяем дубликаты вручную
                const usersRef = db.ref("users");
                const snapshot = await usersRef.orderByChild("username").equalTo(username).once("value");
                if (snapshot.exists()) {
                    return res.json({ success: false, message: "Имя пользователя уже занято" });
                }

                const hash = await bcrypt.hash(password, 10);
                
                // Создаем новый уникальный ID для пользователя в Firebase
                const newUserRef = usersRef.push();
                await newUserRef.set({
                    id: newUserRef.key,
                    username,
                    email,
                    password_hash: hash,
                    score: 0 // Сразу задаем начальные очки для лидерборда
                });

                res.json({ success: true, message: "Регистрация успешна! Теперь войдите." });
            } catch (e) {
                res.json({ success: false, message: "Ошибка: " + e.message });
            }
        });

        // АВТОРИЗАЦИЯ (ВХОД)
        app.post("/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                
                const usersRef = db.ref("users");
                const snapshot = await usersRef.orderByChild("username").equalTo(username).once("value");

                if (!snapshot.exists()) {
                    return res.json({ success: false, message: "Пользователь не найден" });
                }

                // Достаем объект пользователя из структуры Firebase
                const userData = snapshot.val();
                const userId = Object.keys(userData)[0];
                const user = userData[userId];

                const valid = await bcrypt.compare(password, user.password_hash);
                if (!valid) {
                    return res.json({ success: false, message: "Неверный пароль" });
                }

                res.json({
                    success: true,
                    user: {
                        id: user.id,
                        username: user.username,
                        email: user.email
                    }
                });
            } catch (e) {
                res.status(500).json({ success: false, message: "Ошибка сервера" });
            }
        });

        // ЛИДЕРБОРД / ВЫВОД ПОЛЬЗОВАТЕЛЕЙ НА ЭКРАН (То, что просил учитель)
        app.get("/users", async (req, res) => {
            try {
                const usersRef = db.ref("users");
                const snapshot = await usersRef.once("value");
                const usersData = snapshot.val();

                let usersList = [];
                if (usersData) {
                    usersList = Object.values(usersData).map(u => ({
                        id: u.id,
                        username: u.username,
                        score: u.score || 0
                    }));
                    // Сортируем топ игроков по очкам (от большего к меньшему)
                    usersList.sort((a, b) => b.score - a.score);
                }

                res.json(usersList);
            } catch (err) {
                console.error("Ошибка в GET /users:", err.message);
                res.status(500).json({ success: false });
            }
        });

        // ОБНОВЛЕНИЕ РЕЗУЛЬТАТОВ В ЛИДЕРБОРДЕ
        app.post("/leaderboard", async (req, res) => {
            try {
                const { user_id, score } = req.body;
                if (!user_id || score === undefined) {
                    return res.status(400).json({ success: false });
                }

                const userScoreRef = db.ref(`users/${user_id}/score`);
                const snapshot = await userScoreRef.once("value");
                const currentScore = snapshot.val() || 0;

                // Прибавляем новые очки к старым
                await userScoreRef.set(currentScore + score);

                res.json({ success: true });
            } catch (err) {
                console.error("Ошибка в POST /leaderboard:", err.message);
                res.status(500).json({ success: false });
            }
        });

        // ПОЛУЧЕНИЕ ВСЕХ СТРАН И ФЛАГОВ
        app.get("/flags", async (req, res) => {
            try {
                const countriesRef = db.ref("countries");
                const snapshot = await countriesRef.once("value");
                const countriesData = snapshot.val();

                const countriesList = countriesData ? Object.values(countriesData) : [];
                res.json(countriesList);
            } catch (err) {
                res.status(500).json({ success: false });
            }
        });

        // СЛУЧАЙНЫЙ КВИЗ (ВОПРОС И 4 ВАРИАНТА ОТВЕТА)
        app.get("/quiz/random", async (req, res) => {
            try {
                const countriesRef = db.ref("countries");
                const snapshot = await countriesRef.once("value");
                const countriesData = snapshot.val();

                const allCountries = countriesData ? Object.values(countriesData) : [];
                if (allCountries.length < 4) return res.status(400).json({ success: false });

                const correct = allCountries[Math.floor(Math.random() * allCountries.length)];
                const options = allCountries
                    .filter(c => c.id !== correct.id)
                    .sort(() => 0.5 - Math.random())
                    .slice(0, 3);

                res.json({
                    correct,
                    options: [correct, ...options].sort(() => 0.5 - Math.random())
                });
            } catch (err) {
                res.status(500).json({ success: false });
            }
        });

        // ФАКТЫ О СТРАНАХ
        app.get("/facts", async (req, res) => {
            try {
                const factsRef = db.ref("facts");
                const snapshot = await factsRef.once("value");
                const factsData = snapshot.val();

                const factsList = factsData ? Object.values(factsData) : [];
                res.json(factsList);
            } catch (err) {
                res.status(500).json({ success: false });
            }
        });

        // Запуск прослушивания порта (на Render используется process.env.PORT)
        const PORT = process.env.PORT || 5000;
        app.listen(PORT, () => {
            console.log(`Сервер запущен на порту: ${PORT}`);
        });

    } catch (err) {
        console.error("Критическая ошибка запуска сервера:", err.message);
    }
}

startServer();