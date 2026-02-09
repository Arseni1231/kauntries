import React, { useEffect, useState } from "react";
import "../css/leaderboard.css";

export default function Leaderboard() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await fetch("http://localhost:5000/users");
      
      
      if (!res.ok) {
        throw new Error(`Ошибка сервера: ${res.status}. Возможно, эндпоинт /users не создан.`);
      }

      const data = await res.json();
      

  
      setUsers(Array.isArray(data) ? data : []);
      setLoading(false);
    } catch (err) {
      console.error("Детальная ошибка:", err);
      setError(err.message);
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  if (loading) return <div className="leaderboard-container"><p>Загрузка таблицы лидеров...</p></div>;
  
  if (error) return (
    <div className="leaderboard-container">
      <p style={{ color: "red" }}>{error}</p>
      <button onClick={fetchUsers}>Попробовать снова</button>
    </div>
  );

  return (
    <div className="leaderboard-container">
      <h2>Таблица лидеров</h2>
      <table className="leaderboard-table">
        <thead>
          <tr>
            <th>Место</th>
            <th>Имя пользователя</th>
            <th>Очки</th>
          </tr>
        </thead>
        <tbody>
          {users.length > 0 ? (
            users.map((user, index) => (
              <tr key={user.id || index}>
                <td>{index + 1}</td>
                <td>{user.username}</td>
                <td>{user.score || 0}</td>
              </tr>
            ))
          ) : (
            <tr>
              <td colSpan="3">Лидеров пока нет. Будь первым!</td>
            </tr>
          )}
        </tbody>
      </table>
    </div>
  );
}