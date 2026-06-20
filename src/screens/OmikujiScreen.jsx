import { useEffect, useRef, useState } from "react";
import { motion, useAnimation } from "framer-motion";
import { drawOmikuji } from "../data/omikuji";
import { play } from "../lib/sound";

// おみくじ画面
// props:
//   onComplete: (result: { result, points, color, comment }) => void
//               結果表示5秒後に自動で呼ばれる。ポイント加算は App.jsx 側で行う。
export default function OmikujiScreen({ onComplete }) {
  const [phase, setPhase] = useState("shake"); // shake | reveal
  const [result, setResult] = useState(null);
  const [shakeCount, setShakeCount] = useState(0);
  const controls = useAnimation();
  const autoRevealRef = useRef(null);
  const autoBackRef = useRef(null);

  // 3秒後に自動で結果を出す
  useEffect(() => {
    autoRevealRef.current = setTimeout(() => {
      if (phase === "shake") reveal();
    }, 3000);
    return () => {
      clearTimeout(autoRevealRef.current);
      clearTimeout(autoBackRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function reveal() {
    clearTimeout(autoRevealRef.current);
    play("omikuji_result");
    const r = drawOmikuji();
    setResult(r);
    setPhase("reveal");
    // 5秒後にマイページへ戻る
    autoBackRef.current = setTimeout(() => {
      onComplete(r);
    }, 5000);
  }

  async function handleShake() {
    if (phase !== "shake") return;
    play("omikuji_shake");
    setShakeCount((c) => c + 1);
    await controls.start({
      rotate: [0, -18, 18, -12, 12, -6, 6, 0],
      transition: { duration: 0.5, ease: "easeInOut" },
    });
  }

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

        {shakeCount > 0 && (
          <div className="flex gap-1">
            {Array.from({ length: Math.min(shakeCount, 7) }).map((_, i) => (
              <span key={i} className="text-court-gold text-sm">★</span>
            ))}
          </div>
        )}

        <p className="text-xs text-gray-500">（3秒後に自動で結果が出ます）</p>
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

      <p className="text-xs text-gray-600 mt-4">5秒後にマイページへ戻ります…</p>
    </div>
  );
}
