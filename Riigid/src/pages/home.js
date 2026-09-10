import React, { useEffect, useState } from "react";
import "../css/Home.css";

export default function Home() {
  const [firebaseData, setFirebaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // ВСТАВЬТЕ СЮДА ССЫЛКУ НА ВАШУ REALTIME DATABASE И ОБЯЗАТЕЛЬНО ДОПИШИТЕ /.json В КОНЦЕ
  const databaseURL = "https://andmebaas-2d75c-default-rtdb.europe-west1.firebasedatabase.app/.json";

  useEffect(() => {
    fetch(databaseURL)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Не удалось подключиться к базе Firebase");
        }
        return response.json();
      })
      .then((data) => {
        setFirebaseData(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return <div style={{ padding: "40px", fontSize: "20px", textAlign: "center" }}>Загрузка данных из Firebase...</div>;
  }

  if (error) {
    return <div style={{ padding: "40px", color: "red", textAlign: "center" }}>Ошибка: {error}</div>;
  }

  return (
    <div className="home" style={{ padding: "40px", maxWidth: "800px", margin: "0 auto" }}>
      <h1>Данные из моей базы Firebase</h1>
      <p className="description">
        Вся информация ниже загружается напрямую из облака Firebase Realtime Database в реальном времени:
      </p>

      {/* Окно вывода сырого JSON, который вы написали вручную в консоли */}
      <pre style={{
        backgroundColor: "#1e1e1e",
        color: "#39ff14", /* Неоново-зеленый цвет текста для стиля консоли */
        padding: "20px",
        borderRadius: "8px",
        overflowX: "auto",
        fontSize: "16px",
        textAlign: "left",
        fontFamily: "Courier New, monospace",
        border: "1px solid #333",
        boxShadow: "0 4px 10px rgba(0,0,0,0.3)"
      }}>
        {JSON.stringify(firebaseData, null, 2)}
      </pre>
    </div>
  );
}