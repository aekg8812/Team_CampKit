import { useEffect, useState, useMemo } from "react";
import { motion } from "framer-motion";
import { play, stop } from "../lib/sound";
import { LEVEL_LABEL } from "../data/tasksByHabit";

// candidates: [{ id, text, level }, ...] を props で受け取る
export default function GachaScreen({ candidates, onComplete }) {
  const winner = useMemo(
    () => candidates[Math.floor(Math.random() * candidates.length)],
    // eslint-disable-next-line react-hooks/exhaustive-deps
    []
  );

  const [phase, setPhase] = useState("intro");
  const [displayIndex, setDisplayIndex] = useState(0);

  // ガチャ画面BGM：入ったら再生、出たら停止
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
        if (winner.level === 3) play("alarm");
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
      <div className="court-frame flex flex-col items-center justify-center text-center gap-4">
        <motion.p
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-2xl font-extrabold text-court-gold"
        >
          今日の課題を決定します
        </motion.p>
      </div>
    );
  }

  const shown = candidates[displayIndex];
  const stopped = phase === "stop";
  const style = LEVEL_LABEL[stopped ? winner.level : shown.level];

  return (
    <div
      className={`court-frame flex flex-col items-center justify-center text-center gap-6 ${
        stopped && winner.level === 3 ? "animate-shake" : ""
      }`}
    >
      <motion.div
        key={displayIndex}
        animate={{ scale: stopped ? 1.12 : 1 }}
        className="w-full py-10 px-6 rounded-2xl border-4"
        style={{ borderColor: style.color, boxShadow: `0 0 36px ${style.color}55` }}
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
          className="text-sm"
          style={{ color: style.color }}
        >
          {style.note}
        </motion.p>
      )}
    </div>
  );
}
