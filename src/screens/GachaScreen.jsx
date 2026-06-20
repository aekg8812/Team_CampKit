import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { play, stop } from "../lib/sound";
import { LEVEL_LABEL } from "../data/tasksByHabit";

const ULTRA_STYLE = { label: "【激重】", color: "#ff2222", note: "覚悟しろ！！！" };

export default function GachaScreen({ candidates, onComplete }) {
  const winner = useMemo(
    () => candidates[Math.floor(Math.random() * candidates.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [phase, setPhase] = useState("intro");
  const [displayIndex, setDisplayIndex] = useState(0);

  useEffect(() => {
    play("bgm_gacha");
    return () => stop("bgm_gacha");
  }, []);

  useEffect(() => {
    const t = setTimeout(() => {
      setPhase("spin");
      play("roulette");
    }, 1500);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (phase !== "spin") return;
    let i = 0;
    let delay = 80;
    let timer;
    const tick = () => {
      i = (i + 1) % candidates.length;
      setDisplayIndex(i);
      delay += 20;
      if (delay < 420) {
        timer = setTimeout(tick, delay);
      } else {
        const winIdx = candidates.findIndex((c) => c.id === winner.id);
        setDisplayIndex(winIdx >= 0 ? winIdx : 0);
        stop("roulette");
        play("gavel");
        if (winner.level === 3 || winner.isUltra) play("alarm");
        setPhase("stop");
        setTimeout(() => onComplete(winner), 2200);
      }
    };
    timer = setTimeout(tick, delay);
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase]);

  if (phase === "intro") {
    return (
      <div className="court-frame flex flex-col items-center justify-center text-center min-h-screen">
        <motion.p
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
          className="text-2xl font-extrabold text-court-gold tracking-wide"
        >
          今日の課題を決定します
        </motion.p>
      </div>
    );
  }

  const shown = candidates[displayIndex];
  const stopped = phase === "stop";
  const activeTask = stopped ? winner : shown;
  const style = activeTask.isUltra ? ULTRA_STYLE : (LEVEL_LABEL[activeTask.level] || LEVEL_LABEL[1]);

  return (
    <div
      className={`court-frame flex flex-col items-center justify-center text-center gap-6 min-h-screen ${
        stopped && (winner.level === 3 || winner.isUltra) ? "animate-shake" : ""
      }`}
    >
      <motion.div
        key={displayIndex}
        animate={{ scale: stopped ? 1.04 : 1 }}
        transition={{ type: "spring", stiffness: 240, damping: 22 }}
        className="w-full py-10 px-6 rounded-3xl border-2"
        style={{
          borderColor: style.color,
          boxShadow: stopped ? `0 0 32px ${style.color}44` : `0 0 12px ${style.color}22`,
          background: `${style.color}08`,
        }}
      >
        <p className="text-xs tracking-widest mb-3 font-bold" style={{ color: style.color }}>
          {style.label}
        </p>
        <p className="text-2xl font-extrabold leading-relaxed">{activeTask.text}</p>
        {stopped && activeTask.isUltra && (
          <p className="text-xs text-red-400 mt-3 font-bold">⚠️ 激重課題発動！覚悟しろ！</p>
        )}
      </motion.div>

      {stopped && (
        <motion.p
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-sm font-bold"
          style={{ color: style.color }}
        >
          {style.note}
        </motion.p>
      )}
    </div>
  );
}
