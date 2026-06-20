import { motion } from "framer-motion";
import { getHabit } from "../data/habits";
import { formatDuration } from "../data/penaltyTime";

export default function LogDetailScreen({ entry, onBack }) {
  const habit = getHabit(entry.habitId);
  const isSuccess = entry.result === "success";

  return (
    <motion.div
      initial={{ opacity: 0, x: 30 }}
      animate={{ opacity: 1, x: 0 }}
      className="court-frame flex flex-col gap-5 py-6"
    >
      <div className="flex items-center gap-3">
        <button onClick={onBack} className="text-gray-400 text-sm underline">
          ← 戻る
        </button>
        <h2 className="text-lg font-bold">詳細ログ</h2>
      </div>

      {/* 結果バッジ */}
      <div
        className={`w-full py-4 px-4 rounded-xl border-2 text-center ${
          isSuccess ? "border-court-low" : "border-court-danger"
        }`}
      >
        <p className="text-3xl mb-1">{isSuccess ? "✅" : "❌"}</p>
        <p className="text-lg font-extrabold">{entry.taskText}</p>
        <p className="text-xs text-gray-400 mt-1">
          {habit.icon} {habit.label}
        </p>
      </div>

      {/* 日付・所要時間 */}
      <div className="bg-court-panel rounded-xl p-4 flex flex-col gap-2 text-sm">
        <Row label="日付" value={entry.date} />
        <Row
          label="所要時間"
          value={entry.durationSec != null ? formatDuration(entry.durationSec) : "—"}
        />
      </div>

      {/* コメント */}
      {entry.comment ? (
        <div className="bg-court-panel rounded-xl p-4">
          <p className="text-xs text-gray-400 mb-1">コメント</p>
          <p className="text-sm">{entry.comment}</p>
        </div>
      ) : null}

      {/* 証拠写真 */}
      <div className="bg-court-panel rounded-xl p-4">
        <p className="text-xs text-gray-400 mb-2">証拠写真</p>
        {entry.imageData ? (
          <img
            src={entry.imageData}
            alt="証拠"
            className="w-full max-h-64 object-contain rounded-lg"
          />
        ) : (
          <p className="text-sm text-gray-500">写真なし</p>
        )}
      </div>
    </motion.div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex justify-between">
      <span className="text-gray-400">{label}</span>
      <span>{value}</span>
    </div>
  );
}
