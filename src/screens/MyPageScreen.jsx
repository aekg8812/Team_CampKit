import { useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { getHabit } from "../data/habits";
import { isSupabaseMode } from "../store";

const spring = { type: "spring", stiffness: 280, damping: 26 };
const cardShadow = "0 4px 28px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)";
const goldGlow   = "0 4px 20px rgba(201,162,39,0.28)";

// 数値カウントアップ
function AnimCount({ value }) {
  const [display, setDisplay] = useState(value);
  const prevRef = useRef(value);
  const shouldReduce = useReducedMotion();

  useEffect(() => {
    if (shouldReduce) { setDisplay(value); prevRef.current = value; return; }
    const start = prevRef.current;
    const diff = value - start;
    if (diff === 0) return;
    const dur = Math.min(700, Math.abs(diff) * 30 + 200);
    const t0 = performance.now();
    let raf;
    function tick(now) {
      const p = Math.min((now - t0) / dur, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setDisplay(Math.round(start + diff * eased));
      if (p < 1) { raf = requestAnimationFrame(tick); } else { prevRef.current = value; }
    }
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [value, shouldReduce]);

  return <>{display}</>;
}

// 成功率円グラフ
function PieChart({ success, fail }) {
  const total = success + fail;
  const shouldReduce = useReducedMotion();

  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-20 text-court-muted text-xs">
        まだ記録なし
      </div>
    );
  }

  const ratio = success / total;
  const r = 36, cx = 44, cy = 44;
  const circ = 2 * Math.PI * r;
  const len = circ * ratio;

  return (
    <div className="flex flex-col items-center gap-2">
      <svg width="88" height="88" viewBox="0 0 88 88">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#dc353540" strokeWidth="14" />
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#dc3535" strokeWidth="14"
          strokeDasharray={`${circ * (1 - ratio)} ${circ}`}
          strokeDashoffset={circ * ratio}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <motion.circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke="#3dab42" strokeWidth="14"
          strokeDasharray="0 999"
          animate={{ strokeDasharray: `${len} ${circ}` }}
          transition={{ duration: shouldReduce ? 0 : 1.0, delay: 0.2, ease: "easeOut" }}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text x={cx} y={cy - 3} textAnchor="middle" fill="#f0edf5" fontSize="16" fontWeight="bold">
          {Math.round(ratio * 100)}%
        </text>
        <text x={cx} y={cy + 13} textAnchor="middle" fill="#6b6882" fontSize="8">成功率</text>
      </svg>
      <div className="flex gap-3 text-xs text-court-muted">
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-court-low inline-block" />成功 {success}
        </span>
        <span className="flex items-center gap-1.5">
          <span className="w-2 h-2 rounded-full bg-court-danger inline-block" />失敗 {fail}
        </span>
      </div>
    </div>
  );
}

const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show:   { opacity: 1, y: 0, transition: { type: "spring", stiffness: 280, damping: 26 } },
};

export default function MyPageScreen({ username, data, onStart, onEditHabits, onLogout, onViewLog, onOmikuji }) {
  const { successCount, failCount, habitStreaks, selectedHabits, history, points = 0 } = data;
  const today = new Date().toISOString().slice(0, 10);
  const canOmikuji = data.lastOmikujiDate !== today;
  const shouldReduce = useReducedMotion();

  const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: shouldReduce ? 0 : 0.07 } },
  };

  return (
    <div className="court-frame flex flex-col gap-3 py-5">
      {/* ヘッダー */}
      <div className="flex justify-between items-center mb-1">
        <div>
          <p className="text-base font-bold">{username}</p>
          {isSupabaseMode && (
            <p className="text-xs text-court-gold">☁ クラウド同期中</p>
          )}
        </div>
        <motion.button
          onClick={onLogout}
          whileTap={{ scale: 0.95 }}
          className="text-xs text-gray-400 border border-white/15 rounded-xl px-3 py-1.5 hover:border-white/30 hover:text-white transition-colors"
        >
          ログアウト
        </motion.button>
      </div>

      {/* Bento row1: Points (left tall) + Stats / Total (right) */}
      <motion.div
        className="flex gap-3"
        variants={stagger}
        initial="hidden"
        animate="show"
      >
        {/* Left: Points + おみくじ */}
        <motion.div
          variants={fadeUp}
          className="bg-court-panel rounded-3xl p-5 flex flex-col justify-between flex-1"
          style={{ boxShadow: cardShadow }}
        >
          <div>
            <p className="text-xs text-court-muted font-semibold uppercase tracking-widest mb-3">Points</p>
            <p className="text-5xl font-extrabold text-court-gold leading-none tabular-nums">
              <AnimCount value={points} />
            </p>
            <p className="text-xs text-court-muted mt-1.5">ポイント</p>
          </div>

          <motion.button
            onClick={canOmikuji ? onOmikuji : undefined}
            disabled={!canOmikuji}
            whileTap={canOmikuji ? { scale: 0.93 } : undefined}
            className={`mt-5 w-full py-3 rounded-2xl text-sm font-bold transition-opacity ${
              canOmikuji
                ? "bg-court-gold text-court-bg"
                : "bg-court-panel2 text-gray-500 cursor-not-allowed"
            }`}
            style={canOmikuji ? { boxShadow: goldGlow } : undefined}
          >
            {canOmikuji
              ? "🎋 おみくじを引く"
              : <span className="text-xs leading-tight">おみくじ<br />明日また</span>}
          </motion.button>
        </motion.div>

        {/* Right: Stats + Total */}
        <div className="flex flex-col gap-3 flex-1">
          <motion.div
            variants={fadeUp}
            className="bg-court-panel rounded-3xl p-4 flex flex-col items-center"
            style={{ boxShadow: cardShadow }}
          >
            <p className="text-xs text-court-muted font-semibold uppercase tracking-widest mb-2 self-start">Stats</p>
            <PieChart success={successCount} fail={failCount} />
          </motion.div>

          <motion.div
            variants={fadeUp}
            className="bg-court-panel rounded-3xl p-4"
            style={{ boxShadow: cardShadow }}
          >
            <p className="text-xs text-court-muted font-semibold uppercase tracking-widest mb-1">Total</p>
            <p className="text-2xl font-extrabold tabular-nums">
              <AnimCount value={successCount + failCount} />
            </p>
            <p className="text-xs text-court-muted mt-0.5">挑戦回数</p>
          </motion.div>
        </div>
      </motion.div>

      {/* Streaks */}
      <motion.div
        className="bg-court-panel rounded-3xl p-5"
        variants={fadeUp}
        initial="hidden"
        animate="show"
        transition={{ ...spring, delay: shouldReduce ? 0 : 0.18 }}
        style={{ boxShadow: cardShadow }}
      >
        <p className="text-xs text-court-muted font-semibold uppercase tracking-widest mb-3">Streaks</p>
        {selectedHabits.length === 0 ? (
          <p className="text-xs text-court-muted">サボり癖が未選択です</p>
        ) : (
          <div className="space-y-3">
            {selectedHabits.map((id) => {
              const h = getHabit(id);
              const raw = habitStreaks[id] || {};
              const streak = raw.currentStreak ?? raw.current ?? 0;
              const best   = raw.best ?? 0;
              const level  = raw.level ?? 1;
              return (
                <div key={id} className="flex items-center justify-between">
                  <span className="text-sm">
                    {h.icon}{" "}
                    <span className="text-gray-300 text-sm">{h.label}</span>
                  </span>
                  <div className="text-right shrink-0 ml-2">
                    <span className="text-court-gold font-bold text-sm tabular-nums">
                      <AnimCount value={streak} />連続
                    </span>
                    <span className="text-court-muted text-xs ml-1.5">
                      最高{best} / Lv{level}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* 今日の課題を始める CTA */}
      <motion.button
        onClick={onStart}
        whileTap={{ scale: 0.97 }}
        className="w-full py-5 bg-court-gold text-court-bg font-extrabold rounded-3xl text-lg tracking-wide"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ ...spring, delay: shouldReduce ? 0 : 0.22 }}
        style={{ boxShadow: "0 6px 28px rgba(201,162,39,0.35)" }}
      >
        今日の課題を始める →
      </motion.button>

      {/* 履歴 */}
      <motion.div
        className="bg-court-panel rounded-3xl p-5"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ ...spring, delay: shouldReduce ? 0 : 0.28 }}
        style={{ boxShadow: cardShadow }}
      >
        <p className="text-xs text-court-muted font-semibold uppercase tracking-widest mb-3">History</p>
        <div className="space-y-1 max-h-52 overflow-y-auto -mx-1 px-1">
          {history.length === 0 ? (
            <p className="text-xs text-court-muted">まだ履歴がありません</p>
          ) : (
            history.slice(0, 20).map((h, i) => (
              <motion.button
                key={i}
                layout
                onClick={() => onViewLog?.(h)}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center gap-2 text-xs text-left px-3 py-2 rounded-xl hover:bg-court-panel2 transition-colors"
              >
                <span className="shrink-0">{h.result === "success" ? "✅" : "❌"}</span>
                <span className="text-court-muted shrink-0">{h.date}</span>
                <span className="truncate text-gray-300">{h.taskText}</span>
                {h.imageData && <span className="shrink-0 text-court-gold">📷</span>}
              </motion.button>
            ))
          )}
        </div>
      </motion.div>

      {/* サボり癖を編集する — 視認性の高いセカンダリボタン */}
      <motion.button
        onClick={onEditHabits}
        whileTap={{ scale: 0.97 }}
        className="w-full py-3 text-sm text-gray-300 border border-white/20 rounded-2xl hover:border-court-gold hover:text-court-gold transition-colors"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: shouldReduce ? 0 : 0.33 }}
      >
        サボり癖を編集する
      </motion.button>
    </div>
  );
}
