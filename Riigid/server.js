
const express = require("express");
const mysql = require("mysql2/promise");
const bcrypt = require("bcrypt");
const cors = require("cors");

const app = express();


app.use(cors({
    origin: ["http://localhost:3000", "http://localhost:3001"],
    credentials: true
}));

app.use(express.json());


app.use("/flags", express.static("public/flags"));

async function startServer() {
    try {
      
        const db = await mysql.createPool({
            host: "localhost",
            user: "root",
            password: "", 
            database: "country",
        });

  

        
        app.post("/register", async (req, res) => {
            try {
                const { username, email, password } = req.body;
                if (!username || !email || !password) {
                    return res.json({ 
                        success: false, message: "Все поля обязательны"
                 });
                }

                const hash = await bcrypt.hash(password, 10);
                await db.query(
                    "INSERT INTO users (username, email, password_hash) VALUES (?, ?, ?)",
                    [username, email, hash]
                );

                res.json({ success: true, message: "Регистрация успешна! Теперь войдите." });
            } catch (e) {
                if (e.code === 'ER_DUP_ENTRY') {
                    res.json({ success: false, message: "Имя пользователя или email уже заняты" });
                } else {
                    res.json({ success: false, message: "Ошибка: " + e.message });
                }
            }
        });

        app.post("/login", async (req, res) => {
            try {
                const { username, password } = req.body;
                const [rows] = await db.query("SELECT * FROM users WHERE username = ?", [username]);

                if (rows.length === 0) {
                    return res.json({ success: false, message: "Пользователь не найден" });
                }

                const user = rows[0];
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

  
        app.get("/users", async (req, res) => {
            try {
           
                const [rows] = await db.query(`
                    SELECT 
                        u.id, 
                        u.username, 
                        COALESCE(l.total_score, 0) AS score 
                    FROM users u
                    LEFT JOIN leaderboard l ON u.id = l.user_id
                    ORDER BY score DESC
                `);
                res.json(rows);
            } catch (err) {
                console.error("Ошибка в GET /users:", err.message);
                res.status(500).json({ success: false });
            }
        });

        app.post("/leaderboard", async (req, res) => {
            try {
                const { user_id, score } = req.body;
                if (!user_id || score === undefined) {
                    return res.status(400).json({ success: false });
                }

            
                await db.query(
                    `INSERT INTO leaderboard (user_id, total_score, updated_at)
                     VALUES (?, ?, NOW())
                     ON DUPLICATE KEY UPDATE total_score = total_score + ?, updated_at = NOW()`,
                    [user_id, score, score]
                );

                res.json({ success: true });
            } catch (err) {
                console.error("Ошибка в POST /leaderboard:", err.message);
                res.status(500).json({ success: false });
            }
        });

   
        app.get("/flags", async (req, res) => {
            try {
                const [rows] = await db.query("SELECT id, country_name, flag_url, capital, region FROM countries");
                res.json(rows);
            } catch (err) {
                res.status(500).json({ success: false });
            }
        });


        app.get("/quiz/random", async (req, res) => {
            try {
                const [allCountries] = await db.query("SELECT id, country_name, flag_url FROM countries");
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

        app.get("/facts", async (req, res) => {
            try {
                const [rows] = await db.query(`
                    SELECT f.id, f.fact, c.country_name, c.id AS country_id
                    FROM facts f
                    JOIN countries c ON f.country_id = c.id
                `);
                res.json(rows);
            } catch (err) {
                res.status(500).json({ success: false });
            }
        });

        app.listen(5000, () => {
            console.log("Сервер запущен: http://localhost:5000");
            console.log("Лидерборд доступен: http://localhost:5000/users");
        });

    } catch (err) {
        console.error("Критическая ошибка запуска сервера:", err.message);
    }
}

startServer();