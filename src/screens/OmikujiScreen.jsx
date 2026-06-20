import { useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { drawOmikuji } from "../data/omikuji";
import { play } from "../lib/sound";

// 必要タップ回数
const REQUIRED_SHAKES = 3;

// おみくじ画面
// props:
//   onReveal:   (result) => void  結果が出た瞬間に呼ぶ（即時保存用）
//   onComplete: ()       => void  5秒後に呼ぶ（画面遷移用）
export default function OmikujiScreen({ onReveal, onComplete }) {
  const [phase, setPhase] = useState("shake"); // shake | reveal
  const [result, setResult] = useState(null);
  const [shakeCount, setShakeCount] = useState(0);
  const controls = useAnimation();
  // レースコンディション防止
  const isAnimatingRef = useRef(false);
  const revealedRef = useRef(false);

  async function handleShake() {
    // アニメーション中 / 結果表示済み / reveal フェーズ は何もしない
    if (phase !== "shake" || isAnimatingRef.current || revealedRef.current) return;
    isAnimatingRef.current = true;

    play("omikuji_shake");
    const newCount = shakeCount + 1;
    setShakeCount(newCount);

    await controls.start({
      rotate: [0, -20, 20, -14, 14, -8, 8, 0],
      transition: { duration: 0.5, ease: "easeInOut" },
    });

    isAnimatingRef.current = false;

    // 3回目で結果へ（revealedRef で二重呼び出しを防ぐ）
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
      <div className="court-frame flex flex-col items-center justify-center gap-8">
        <p className="text-court-gold font-extrabold tracking-widest text-xl">おみくじ</p>

        <motion.div
          animate={controls}
          onClick={handleShake}
          className="w-44 h-44 bg-court-panel border-4 border-court-gold rounded-2xl flex flex-col items-center justify-center cursor-pointer select-none active:scale-95 transition-transform"
          style={{ boxShadow: "0 0 32px #f5b30144" }}
        >
          <span className="text-6xl">🎋</span>
          <p className="text-xs text-court-gold mt-2 font-bold">タップして振る</p>
        </motion.div>

        {/* タップ済みインジケーター */}
        <div className="flex gap-3 items-center">
          {Array.from({ length: REQUIRED_SHAKES }).map((_, i) => (
            <motion.span
              key={i}
              initial={{ scale: 0.5, opacity: 0.3 }}
              animate={i < shakeCount ? { scale: 1, opacity: 1 } : { scale: 0.5, opacity: 0.3 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="text-2xl"
            >
              ★
            </motion.span>
          ))}
        </div>

        <p className="text-sm font-bold text-gray-300">
          {remaining > 0
            ? `あと${remaining}回振ってください`
            : "振っています…"}
        </p>
      </div>
    );
  }

  // reveal フェーズ
  return (
    <div className="court-frame flex flex-col items-center justify-center gap-6 text-center">
      <motion.div
        initial={{ scaleY: 0, opacity: 0 }}
        animate={{ scaleY: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full"
      >
        <p className="text-xs text-gray-400 tracking-widest mb-4">— 結果 —</p>

        <motion.p
          initial={{ scale: 0.4, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.3, type: "spring", stiffness: 200 }}
          className="text-7xl font-extrabold mb-4"
          style={{ color: result.color }}
        >
          {result.result}
        </motion.p>

        {result.points > 0 ? (
          <motion.p
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="text-court-gold font-bold text-lg mb-3"
          >
            +{result.points}pt 獲得！
          </motion.p>
        ) : (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
            className="text-court-danger font-bold text-lg mb-3"
          >
            ポイントなし…
          </motion.p>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.9 }}
          className="text-sm text-gray-300 px-4"
        >
          {result.comment}
        </motion.p>
      </motion.div>

      <button
        onClick={onComplete}
        className="mt-4 w-full px-6 py-4 bg-court-gold text-court-bg font-bold rounded-lg"
      >
        マイページへ戻る
      </button>
    </div>
  );
}
