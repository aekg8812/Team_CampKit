import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getQuestionsForHabit } from "../data/questionsByHabit";
import { getHabit } from "../data/habits";
import { play, stop } from "../lib/sound";

const spring = { type: "spring", stiffness: 280, damping: 26 };

export default function QuestionScreen({ selectedHabits, onComplete }) {
  const chosenHabit = useMemo(() => {
    const pool = selectedHabits && selectedHabits.length > 0 ? selectedHabits : ["sabo"];
    return pool[Math.floor(Math.random() * pool.length)];
  }, [selectedHabits]);

  const questions = useMemo(() => getQuestionsForHabit(chosenHabit), [chosenHabit]);
  const habit = getHabit(chosenHabit);

  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);

  useEffect(() => {
    play("bgm_question");
    return () => stop("bgm_question");
  }, []);

  function handleAnswer(optionIndex) {
    const newAnswers = [...answers, optionIndex];
    setAnswers(newAnswers);
    if (current === questions.length - 1) {
      const badness = newAnswers.reduce((s, idx) => s + idx, 0);
      onComplete({ habitId: chosenHabit, answers: newAnswers, badness });
      return;
    }
    setCurrent((c) => c + 1);
  }

  const q = questions[current];
  const progress = ((current + 1) / questions.length) * 100;

  return (
    <div className="court-frame flex flex-col gap-5 py-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-200">
          {habit.icon} {habit.label}
        </span>
        <span className="text-xs text-court-muted">
          {current + 1} / {questions.length}
        </span>
      </div>

      {/* プログレスバー */}
      <div className="w-full h-1.5 bg-court-panel2 rounded-full overflow-hidden">
        <motion.div
          className="h-full bg-court-gold rounded-full"
          animate={{ width: `${progress}%` }}
          transition={{ ...spring }}
        />
      </div>

      {/* 質問エリア */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -24 }}
          transition={{ ...spring }}
          className="flex flex-col gap-4"
        >
          <h2 className="text-xl font-bold leading-relaxed min-h-[5rem] text-white">{q.q}</h2>

          <div className="flex flex-col gap-3">
            {q.options.map((opt, i) => (
              <motion.button
                key={i}
                onClick={() => handleAnswer(i)}
                whileTap={{ scale: 0.97 }}
                className="text-left px-5 py-4 bg-court-panel rounded-2xl border border-white/20 hover:border-court-gold hover:bg-court-panel2 hover:text-white transition-colors text-sm leading-relaxed text-gray-300"
              >
                <span className="text-court-gold text-xs font-bold mr-2">{String.fromCharCode(65 + i)}.</span>
                {opt}
              </motion.button>
            ))}
          </div>
        </motion.div>
      </AnimatePresence>
    </div>
  );
}
