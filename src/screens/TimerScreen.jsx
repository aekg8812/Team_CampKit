import { useEffect, useState } from "react";

const DIFF_COLOR = { low: "#4caf50", mid: "#f5b301", high: "#e23636" };

export default function TimerScreen({ task, prophecy, onCleared, onFailed }) {
  const [remaining, setRemaining] = useState(secondsUntilMidnight());

  useEffect(() => {
    const timer = setInterval(() => {
      const s = secondsUntilMidnight();
      setRemaining(s);
      if (s <= 0) {
        clearInterval(timer);
        onFailed(); // 23:59を過ぎたら自動失敗
      }
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="court-frame flex flex-col items-center justify-center text-center gap-6">
      <p className="text-sm text-gray-400">本日の刑罰</p>
      <p
        className="text-2xl font-extrabold px-4 py-2 rounded-lg"
        style={{ color: DIFF_COLOR[task.difficulty] }}
      >
        {task.text}
      </p>

      <p className="text-5xl font-mono tracking-wider">{formatTime(remaining)}</p>
      <p className="text-xs text-gray-500">23:59 までに執行せよ</p>

      <div className="bg-court-panel rounded-lg p-4 text-sm text-gray-300 leading-relaxed">
        <p className="text-court-danger text-xs mb-2">AIはこう予言しました</p>
        「{prophecy}」
      </div>

      <button
        onClick={onCleared}
        className="px-10 py-4 bg-court-gold text-court-bg font-bold rounded-lg"
      >
        執行完了
      </button>
    </div>
  );
}

function secondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(23, 59, 0, 0);
  return Math.max(0, Math.floor((midnight - now) / 1000));
}

function formatTime(s) {
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}
