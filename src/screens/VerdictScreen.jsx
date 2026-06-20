import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { play } from "../lib/sound";

const DIFF_LABEL = { low: "LOW", mid: "MID", high: "HIGH" };

export default function VerdictScreen({ verdict, task, onNext }) {
  // verdict = { condemnation, prophecy }
  const [typed, setTyped] = useState("");
  const full = verdict.prophecy;

  // 予言をタイピング演出で1文字ずつ表示
  useEffect(() => {
    let i = 0;
    play("reveal");
    const timer = setInterval(() => {
      i++;
      setTyped(full.slice(0, i));
      if (i >= full.length) clearInterval(timer);
    }, 55);
    return () => clearInterval(timer);
  }, [full]);

  return (
    <div className="court-frame flex flex-col gap-6 py-10">
      {/* 判決 */}
      <div className="text-center">
        <p className="tracking-[0.5em] text-court-gold text-sm">判　決</p>
        <div className="h-px bg-court-gold/40 my-4" />
        <p className="text-sm text-gray-400 mb-2">
          【刑罰】難易度：{DIFF_LABEL[task.difficulty]}
        </p>
        <p className="text-2xl font-extrabold mb-6">{task.text}</p>

        <p className="text-sm text-gray-400 mb-2">【断罪】</p>
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-lg leading-relaxed"
        >
          「{verdict.condemnation}」
        </motion.p>
      </div>

      {/* 予言 */}
      <div className="text-center mt-4">
        <p className="tracking-[0.5em] text-court-danger text-sm">予　言</p>
        <div className="h-px bg-court-danger/40 my-4" />
        <p className="text-lg leading-loose min-h-[8rem]">
          「{typed}
          <span className="animate-flicker">▍</span>」
        </p>
      </div>

      {typed === full && (
        <motion.button
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          onClick={onNext}
          className="mt-4 px-8 py-4 bg-court-danger text-white font-bold rounded-lg"
          whileTap={{ scale: 0.95 }}
        >
          刑の執行へ
        </motion.button>
      )}
    </div>
  );
}
