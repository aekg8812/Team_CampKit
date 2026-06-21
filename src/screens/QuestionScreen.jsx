import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { getQuestionsForHabit } from "../data/questionsByHabit";
import { HABIT_QUESTIONS } from "../data/staticData";
import { getHabit } from "../data/habits";
import { generateQuestions, hasKey } from "../lib/ai/geminiProvider";
import { play, stop } from "../lib/sound";

const spring = { type: "spring", stiffness: 280, damping: 26 };

// habit ID（habits.js）→ staticData.js の HABIT_QUESTIONS キーの対応
const STATIC_KEY = {
  sns: "sns",
  room: "cleaning",
  exercise: "exercise",
  sabo: "procrastination",
  human: "lineReply",
  morning: "sleepSchedule",
  meal: "cooking",
};

// 前半5問を staticData から取得（対応キーが無ければ既存データで代替）
function firstFiveStatic(habitId) {
  const key = STATIC_KEY[habitId];
  const pool = (key && HABIT_QUESTIONS[key]) || getQuestionsForHabit(habitId);
  return pool.slice(0, 5);
}

export default function QuestionScreen({ selectedHabits, onComplete }) {
  const chosenHabit = useMemo(() => {
    const pool = selectedHabits && selectedHabits.length > 0 ? selectedHabits : ["sabo"];
    return pool[Math.floor(Math.random() * pool.length)];
  }, [selectedHabits]);

  const habit = getHabit(chosenHabit);
  // APIキーがある時：前半5問staticData＋後半5問は動的生成。無い時：従来の10問。
  const useDynamic = hasKey();
  const TOTAL = 10;

  const [questions, setQuestions] = useState(() =>
    useDynamic ? firstFiveStatic(chosenHabit) : getQuestionsForHabit(chosenHabit)
  );
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [loadingMore, setLoadingMore] = useState(false);

  useEffect(() => {
    play("bgm_question");
    return () => stop("bgm_question");
  }, []);

  async function handleAnswer(optionIndex) {
    if (loadingMore) return;
    const newAnswers = [...answers, optionIndex];
    setAnswers(newAnswers);

    // 前半5問を回答し終えたら、その回答を基に後半5問を動的生成する
    if (useDynamic && questions.length === 5 && newAnswers.length === 5) {
      setLoadingMore(true);
      let dynamic;
      try {
        const priorQA = questions
          .map((q, i) => `Q: ${q.q}\nA: ${q.options[newAnswers[i]] ?? "不明"}`)
          .join("\n\n");
        dynamic = await generateQuestions({ habitLabel: habit.label, priorQA });
      } catch (e) {
        console.warn("[question] 動的生成に失敗、固定の後半5問で代替:", e.message);
        dynamic = getQuestionsForHabit(chosenHabit).slice(5, 10);
      }
      setQuestions((prev) => [...prev, ...dynamic]);
      setLoadingMore(false);
      setCurrent(5);
      return;
    }

    // 全問回答し終えたら完了（回答した実際の questions も渡す）
    if (newAnswers.length >= questions.length) {
      const badness = newAnswers.reduce((s, idx) => s + idx, 0);
      onComplete({ habitId: chosenHabit, answers: newAnswers, questions, badness });
      return;
    }
    setCurrent((c) => c + 1);
  }

  // 後半5問の生成中ローディング
  if (loadingMore) {
    return (
      <div className="court-frame flex flex-col items-center justify-center gap-6 min-h-screen">
        <div className="relative w-14 h-14">
          <div className="absolute inset-0 rounded-full border-2 border-court-panel2" />
          <div className="absolute inset-0 rounded-full border-2 border-court-gold border-t-transparent animate-spin" />
        </div>
        <div className="text-center">
          <p className="text-base font-bold">あなたの回答から質問を生成中…</p>
          <p className="text-xs text-court-muted mt-2">Gemini が後半の質問を作っています</p>
        </div>
      </div>
    );
  }

  const q = questions[current];
  const total = useDynamic ? TOTAL : questions.length;
  const progress = ((current + 1) / total) * 100;

  return (
    <div className="court-frame flex flex-col gap-5 py-6">
      {/* ヘッダー */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-bold text-gray-200">
          {habit.icon} {habit.label}
        </span>
        <span className="text-xs text-court-muted">
          {current + 1} / {total}
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
