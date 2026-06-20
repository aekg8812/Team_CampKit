import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getQuestionsForHabit } from "../data/questionsByHabit";
import { getHabit } from "../data/habits";

export default function QuestionScreen({ selectedHabits, onComplete }) {
  // 選ばれたカテゴリからランダムで1つ選ぶ
  const chosenHabit = useMemo(() => {
    const pool = selectedHabits && selectedHabits.length > 0 ? selectedHabits : ["sabo"];
    return pool[Math.floor(Math.random() * pool.length)];
  }, [selectedHabits]);

  const questions = useMemo(() => getQuestionsForHabit(chosenHabit), [chosenHabit]);
  const habit = getHabit(chosenHabit);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);

  function handleAnswer(optionIndex) {
    const newAnswers = [...answers, optionIndex];
    setAnswers(newAnswers);
    if (current === questions.length - 1) {
      // 回答の「悪さ」を集計して渡す
      const badness = newAnswers.reduce((s, idx) => s + idx, 0);
      onComplete({ habitId: chosenHabit, answers: newAnswers, badness });
      return;
    }
    setCurrent((c) => c + 1);
  }

  const q = questions[current];

  return (
    <div className="court-frame flex flex-col">
      <p className="text-xs text-court-gold tracking-widest mb-1">
        {habit.icon} {habit.label}
      </p>
      <p className="text-xs text-gray-400 mb-6">
        質問 {current + 1} / {questions.length}
      </p>

      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.25 }}
        >
          <h2 className="text-xl font-bold mb-8 leading-relaxed">{q.q}</h2>
          <div className="flex flex-col gap-3">
            {q.options.map((opt, i) => (
              <button
                key={i}
                onClick={() => handleAnswer(i)}
                className="text-left px-5 py-4 bg-court-panel rounded-lg border border-transparent hover:border-court-gold transition"
              >
                {opt}
              </button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
