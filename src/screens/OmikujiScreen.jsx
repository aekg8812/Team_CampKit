import { useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { drawOmikuji } from "../data/omikuji";
import { play } from "../lib/sound";

const REQUIRED_SHAKES = 3;

export default function OmikujiScreen({ onReveal, onComplete }) {
  const [phase, setPhase] = useState("shake");
  const [result, setResult] = useState(null);
  const [shakeCount, setShakeCount] = useState(0);
  const controls = useAnimation();
  const isAnimatingRef = useRef(false);
  const revealedRef = useRef(false);

  async function handleShake() {
    if (phase !== "shake" || isAnimatingRef.current || revealedRef.current) return;
    isAnimatingRef.current = true;

    play("omikuji_shake");
    const newCount = shakeCount + 1;
    setShakeCount(newCount);

    await controls.start({
      rotate: [0, -22, 22, -15, 15, -8, 8, 0],
      transition: { duration: 0.5, ease: "easeInOut" },
    });

    isAnimatingRef.current = false;

    if (newCount >= REQUIRED_SHAKES && !revealedRef.current) {
      revealedRef.current = true;
      setTimeout(() => reveal(), 200);
    }
  }

  async function reveal() {
    play("omikuji_result");
    const r = drawOmikuji();
    setResult(r);
    setPhase("reveal");
    try { await onReveal?.(r); } catch {}
  }

  const remaining = REQUIRED_SHAKES - shakeCount;

  if (phase === "shake") {
    return (
      <div className="court-frame flex flex-col items-center justify-center gap-10 min-h-screen">
        <div className="text-center">
          <p className="text-xs text-court-muted font-semibold uppercase tracking-widest mb-1">Fortune</p>
          <p className="text-2xl font-extrabold text-court-gold">おみくじ</p>
        </div>

        {/* おみくじ本体 */}
        <motion.button
          animate={controls}
          onClick={handleShake}
          whileTap={{ scale: 0.94 }}
          className="w-40 h-40 bg-court-panel border-2 border-court-gold rounded-3xl flex flex-col items-center justify-center select-none cursor-pointer"
          style={{ boxShadow: "0 0 28px #c9a22730" }}
        >
          <span className="text-5xl">🎋</span>
          <p className="text-xs text-court-gold mt-2 font-semibold">タップして振る</p>
        </motion.button>

        {/* インジケーター */}
        <div className="flex flex-col items-center gap-4">
          <div className="flex gap-3">
            {Array.from({ length: REQUIRED_SHAKES }).map((_, i) => (
              <motion.span
                key={i}
                initial={{ scale: 0.5, opacity: 0.3 }}
                animate={i < shakeCount ? { scale: 1.1, opacity: 1 } : { scale: 0.5, opacity: 0.3 }}
                transition={{ type: "spring", stiffness: 300 }}
                className="text-2xl text-court-gold"
              >
                ★
              </motion.span>
            ))}
          </div>
          <p className="text-sm text-court-muted">
            {remaining > 0 ? `あと${remaining}回振ってください` : "振っています…"}
          </p>
        </div>
      </div>
    );
  }

  // reveal フェーズ
  return (
    <div className="court-frame flex flex-col items-center justify-center gap-6 text-center min-h-screen">
      <p className="text-xs text-court-muted font-semibold uppercase tracking-widest">Result</p>

      <motion.div
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.4, ease: "easeOut" }}
        className="w-full"
      >
        <motion.p
          initial={{ scale: 0.3, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.25, type: "spring", stiffness: 180, damping: 12 }}
          className="text-7xl font-extrabold mb-4"
          style={{ color: result.color }}
        >
          {result.result}
        </motion.p>

        {result.points > 0 ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.55 }}
            className="text-court-gold font-bold text-xl mb-3"
          >
            +{result.points}pt 獲得！
          </motion.p>
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.55 }}
            className="text-court-danger font-bold text-lg mb-3"
          >
            ポイントなし…
          </motion.p>
        )}

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="bg-court-panel rounded-2xl px-6 py-4 mx-2"
        >
          <p className="text-sm text-gray-300 leading-relaxed">{result.comment}</p>
        </motion.div>
      </motion.div>

      <motion.button
        onClick={onComplete}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="mt-2 w-full px-6 py-4 bg-court-gold text-court-bg font-bold rounded-2xl"
      >
        マイページへ戻る
      </motion.button>
    </div>
  );
}
