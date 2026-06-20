import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FIXED_QUESTIONS } from "../data/questions";
import { generateDynamicQuestions } from "../lib/claude";

const EVIDENCE_LOGS = [
  "証拠①：SNS依存傾向・記録完了",
  "証拠②：居住環境・分析中",
  "証拠③：先延ばし常習・前科データと照合中",
  "証拠④：運動不足・深刻",
  "証拠⑤：人間関係の放置・検知",
];

export default function InterrogationScreen({ onComplete }) {
  const [questions, setQuestions] = useState(FIXED_QUESTIONS);
  const [current, setCurrent] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [logs, setLogs] = useState([]);
  const [loadingDynamic, setLoadingDynamic] = useState(false);

  const q = questions[current];

  async function handleAnswer(optionIndex) {
    const newAnswers = [...answers, optionIndex];
    setAnswers(newAnswers);

    // 証拠ログを画面端に流す
    if (current < EVIDENCE_LOGS.length) {
      setLogs((prev) => [...prev, EVIDENCE_LOGS[current]]);
    }

    // 前半5問が終わったら後半5問をClaudeで生成
    if (current === 4) {
      setLoadingDynamic(true);
      const summary = FIXED_QUESTIONS.map(
        (fq, i) => `${fq.q} → ${fq.options[newAnswers[i]]}`
      ).join("\n");
      const dynamic = await generateDynamicQuestions(summary);
      setQuestions([...FIXED_QUESTIONS, ...dynamic]);
      setLoadingDynamic(false);
    }

    // 全10問終了
    if (current === 9) {
      onComplete(newAnswers);
      return;
    }
    setCurrent((c) => c + 1);
  }

  if (loadingDynamic) {
    return (
      <div className="court-frame flex flex-col items-center justify-center text-center">
        <p className="text-court-gold animate-flicker">
          回答傾向を分析中…
          <br />
          追加尋問を生成しています…
        </p>
      </div>
    );
  }

  return (
    <div className="court-frame flex flex-col">
      {/* 進捗 */}
      <p className="text-xs text-court-gold tracking-widest mb-1">証拠収集フェーズ</p>
      <p className="text-xs text-gray-400 mb-6">尋問 {current + 1} / 10</p>

      {/* 質問 */}
      <AnimatePresence mode="wait">
        <motion.div
          key={current}
          initial={{ opacity: 0, x: 30 }}
          animate={{ opacity: 1, x: 0 }}
          exit={{ opacity: 0, x: -30 }}
          transition={{ duration: 0.3 }}
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

      {/* 証拠ログ（画面下に流れる） */}
      <div className="mt-8 text-[10px] text-green-400/70 font-mono space-y-1">
        {logs.map((log, i) => (
          <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            &gt; {log}
          </motion.div>
        ))}
      </div>
    </div>
  );
}
