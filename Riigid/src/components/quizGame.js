import React, { useEffect, useState } from "react";
import "../css/quizgame.css";

export default function Quiz() {
  const TOTAL_QUESTIONS = 30;
  const [options, setOptions] = useState([]);
  const [correct, setCorrect] = useState(null);
  const [result, setResult] = useState("");
  const [score, setScore] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [quizOver, setQuizOver] = useState(false);
  const [allCountries, setAllCountries] = useState([]);


  const saveResultToLeaderboard = async (finalScore) => {
    try {
    
      const userData = localStorage.getItem("user");
      console.log("Данные пользователя из памяти:", userData);
      if (!userData) {
        console.warn("Пользователь не авторизован, очки не будут сохранены в БД");
        return;
      }

      const user = JSON.parse(userData);

      const response = await fetch("http://localhost:5000/leaderboard", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user_id: user.id,
          score: finalScore,
        }),
      });

      const data = await response.json();
      if (data.success) {
        console.log("Результат успешно сохранен в таблицу лидеров");
      }
    } catch (err) {
      console.error("Ошибка при отправке очков:", err);
    }
  };

  const shuffleArray = (arr) => {
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [arr[i], arr[j]] = [arr[j], arr[i]];
    }
  };

  const fetchAllCountries = async () => {
    try {
      const res = await fetch("http://localhost:5000/flags");
      const data = await res.json();
      setAllCountries(data);
    } catch (err) {
      console.error("Ошибка загрузки стран:", err);
    }
  };

  const fetchQuiz = async () => {
    if (allCountries.length === 0) return;

    const correctIndex = Math.floor(Math.random() * allCountries.length);
    const correctCountry = allCountries[correctIndex];

    const wrongOptions = [];
    while (wrongOptions.length < 3) {
      const randIndex = Math.floor(Math.random() * allCountries.length);
      const country = allCountries[randIndex];
      if (
        country.country_name !== correctCountry.country_name &&
        !wrongOptions.find((c) => c.country_name === country.country_name)
      ) {
        wrongOptions.push(country);
      }
    }

    const allOptions = [correctCountry, ...wrongOptions];
    shuffleArray(allOptions);

    setCorrect(correctCountry);
    setOptions(allOptions);
    setResult("");
  };

  const checkAnswer = (choice) => {
    if (!correct) return;

    let currentScore = score;
    if (choice === correct.country_name) {
      currentScore = score + 1;
      setScore(currentScore);
    }

    setResult(
      choice === correct.country_name
        ? "Верно!"
        : `Неверно! Правильный ответ: ${correct.country_name}`
    );

    setTimeout(() => {
      if (questionIndex + 1 >= TOTAL_QUESTIONS) {
        setQuizOver(true);
       
        saveResultToLeaderboard(currentScore);
      } else {
        setQuestionIndex((prev) => prev + 1);
        fetchQuiz();
      }
    }, 1500);
  };

  useEffect(() => {
    fetchAllCountries();
  }, []);

  useEffect(() => {
    if (allCountries.length > 0 && !quizOver) fetchQuiz();
  }, [questionIndex, allCountries]);

  if (quizOver) {
    return (
      <div className="quiz-container">
        <h2>Квиз завершён!</h2>
        <p>Ваш результат: {score} из {TOTAL_QUESTIONS}</p>
        <button
          onClick={() => {
            setScore(0);
            setQuestionIndex(0);
            setQuizOver(false);
            fetchQuiz();
          }}
        >
          Пройти заново
        </button>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <h2>Угадай флаг ({questionIndex + 1}/{TOTAL_QUESTIONS})</h2>
      {correct && (
        <img
          src={correct.flag_url}
          alt={`Флаг ${correct.country_name}`}
          width={300}
          height={200}
        />
      )}
      <div className="options">
        <button onClick={() => checkAnswer(options[0]?.country_name)}>
          {options[0]?.country_name}
        </button>
        <button onClick={() => checkAnswer(options[1]?.country_name)}>
          {options[1]?.country_name}
        </button>
        <button onClick={() => checkAnswer(options[2]?.country_name)}>
          {options[2]?.country_name}
        </button>
        <button onClick={() => checkAnswer(options[3]?.country_name)}>
          {options[3]?.country_name}
        </button>
      </div>
      <p className="result">{result}</p>
      <button
        className="skip-btn"
        onClick={() => {
          if (questionIndex + 1 >= TOTAL_QUESTIONS) {
            setQuizOver(true);
            saveResultToLeaderboard(score);
          } else {
            setQuestionIndex((prev) => prev + 1);
          }
        }}
      >
        Пропустить
      </button>
    </div>
  );
}




