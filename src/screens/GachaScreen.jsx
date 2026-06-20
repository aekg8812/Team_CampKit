import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { play, stop } from "../lib/sound";

const DIFF_STYLE = {
  low: { label: "軽微な懲役", color: "#4caf50", quip: "まあ大丈夫でしょ" },
  mid: { label: "中程度の懲役", color: "#f5b301", quip: "ちょっとキツいね" },
  high: { label: "重刑執行", color: "#e23636", quip: "ご愁傷様です" },
};

export default function GachaScreen({ candidates, winner, onComplete }) {
  const [phase, setPhase] = useState("intro"); // intro → spin → stop
  const [displayIndex, setDisplayIndex] = useState(0);

  // [暗転 + 導入] → spinへ
  useEffect(() => {
    const t1 = setTimeout(() => {
      setPhase("spin");
      play("roulette");
    }, 2000);
    return () => clearTimeout(t1);
  }, []);

  // ルーレット回転
  useEffect(() => {
    if (phase !== "spin") return;
    let i = 0;
    let delay = 80;
    let timer;
    const tick = () => {
      i = (i + 1) % candidates.length;
      setDisplayIndex(i);
      delay += 18; // 徐々に減速
      if (delay < 420) {
        timer = setTimeout(tick, delay);
      } else {
        const winIdx = candidates.findIndex((c) => c.id === winner.id);
        setDisplayIndex(winIdx >= 0 ? winIdx : 0);
        stop("roulette");
        play("gavel");
        if (winner.difficulty === "high") play("alarm");
        setPhase("stop");
        setTimeout(onComplete, 2600);
      }
    };
    timer = setTimeout(tick, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === "intro") {
    return (
      <div className="court-frame flex flex-col items-center justify-center text-center gap-4">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-gray-300"
        >
          証拠①〜⑩、および外部データの照合が完了しました。
        </motion.p>
        <motion.p
          className="text-2xl font-extrabold text-court-gold"
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 }}
        >
          判決を下します。
        </motion.p>
      </div>
    );
  }

  const shown = candidates[displayIndex];
  const stopped = phase === "stop";
  const style = stopped ? DIFF_STYLE[winner.difficulty] : DIFF_STYLE[shown.difficulty];

  return (
    <div
      className={`court-frame flex flex-col items-center justify-center text-center gap-6 ${
        stopped && winner.difficulty === "high" ? "animate-shake" : ""
      }`}
    >
      <motion.div
        key={displayIndex}
        animate={{ scale: stopped ? 1.15 : 1 }}
        className="w-full py-10 px-6 rounded-2xl border-4"
        style={{ borderColor: style.color, boxShadow: `0 0 40px ${style.color}55` }}
      >
        <p className="text-xs tracking-widest mb-3" style={{ color: style.color }}>
          {style.label}
        </p>
        <p className="text-2xl font-extrabold leading-relaxed">{shown.text}</p>
      </motion.div>

      {stopped && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-lg font-bold"
          style={{ color: style.color }}
        >
          「{style.quip}」
        </motion.p>
      )}
    </div>
  );
}
