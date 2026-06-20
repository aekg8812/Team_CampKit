import { getHabit } from "../data/habits";
import { isSupabaseMode } from "../store";

function PieChart({ success, fail }) {
  const total = success + fail;
  if (total === 0) {
    return (
      <div className="flex items-center justify-center h-40 text-gray-500 text-sm">
        まだ記録がありません
      </div>
    );
  }
  const successRatio = success / total;
  const r = 60;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * r;
  const successLen = circumference * successRatio;

  return (
    <div className="flex items-center justify-center gap-6 py-2">
      <svg width="160" height="160" viewBox="0 0 160 160">
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e23636" strokeWidth="28" />
        <circle
          cx={cx} cy={cy} r={r}
          fill="none" stroke="#4caf50" strokeWidth="28"
          strokeDasharray={`${successLen} ${circumference}`}
          transform={`rotate(-90 ${cx} ${cy})`}
        />
        <text x={cx} y={cy - 4} textAnchor="middle" className="fill-white" fontSize="22" fontWeight="bold">
          {Math.round(successRatio * 100)}%
        </text>
        <text x={cx} y={cy + 16} textAnchor="middle" fill="#9ca3af" fontSize="11">
          成功率
        </text>
      </svg>
      <div className="text-sm space-y-2">
        <p className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-court-low inline-block" />
          成功 {success}回
        </p>
        <p className="flex items-center gap-2">
          <span className="w-3 h-3 rounded-full bg-court-danger inline-block" />
          失敗 {fail}回
        </p>
      </div>
    </div>
  );
}

export default function MyPageScreen({ username, data, onStart, onEditHabits, onLogout, onViewLog, onOmikuji }) {
  const { successCount, failCount, habitStreaks, selectedHabits, history, points = 0 } = data;
  const today = new Date().toISOString().slice(0, 10);
  const canOmikuji = data.lastOmikujiDate !== today;

  return (
    <div className="court-frame flex flex-col gap-5 py-6">
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-bold">マイページ</h2>
        <button onClick={onLogout} className="text-xs text-gray-400 underline">
          ログアウト
        </button>
      </div>
      <p className="text-sm text-gray-400 -mt-3">
        {username} さん
        {isSupabaseMode && <span className="ml-2 text-court-gold">[クラウド保存中]</span>}
      </p>

      {/* 保有ポイント */}
      <div className="bg-court-panel rounded-xl p-4 flex items-center justify-between">
        <div>
          <p className="text-xs text-gray-400 mb-1">保有ポイント</p>
          <p className="text-3xl font-extrabold text-court-gold">
            {points}<span className="text-base font-bold ml-1">pt</span>
          </p>
        </div>
        <button
          onClick={onOmikuji}
          disabled={!canOmikuji}
          className={`px-4 py-3 rounded-xl text-sm font-bold transition ${
            canOmikuji
              ? "bg-court-gold text-court-bg"
              : "bg-gray-700 text-gray-500 cursor-not-allowed"
          }`}
        >
          {canOmikuji ? "🎋 おみくじを引く" : "おみくじ\n明日また引けます"}
        </button>
      </div>

      <div className="bg-court-panel rounded-xl p-4">
        <p className="text-sm font-bold mb-1">総合成績</p>
        <PieChart success={successCount} fail={failCount} />
      </div>

      <div className="bg-court-panel rounded-xl p-4">
        <p className="text-sm font-bold mb-3">サボり癖別ストリーク</p>
        <div className="space-y-2">
          {selectedHabits.length === 0 && (
            <p className="text-xs text-gray-500">サボり癖が未選択です</p>
          )}
          {selectedHabits.map((id) => {
            const h = getHabit(id);
            const raw = habitStreaks[id] || {};
            // 旧データ互換（current → currentStreak）
            const streak = raw.currentStreak ?? raw.current ?? 0;
            const best   = raw.best ?? 0;
            const level  = raw.level ?? 1;
            return (
              <div key={id} className="flex items-center justify-between text-sm">
                <span>{h.icon} {h.label}</span>
                <span className="text-court-gold">
                  連続{streak}回
                  <span className="text-gray-500 text-xs ml-2">最高{best}回 / Lv{level}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 履歴リスト（タップで詳細表示） */}
      <div className="bg-court-panel rounded-xl p-4">
        <p className="text-sm font-bold mb-3">クリア履歴</p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {history.length === 0 && (
            <p className="text-xs text-gray-500">まだ履歴がありません</p>
          )}
          {history.slice(0, 20).map((h, i) => (
            <button
              key={i}
              onClick={() => onViewLog?.(h)}
              className="w-full flex items-center gap-2 text-xs text-left px-2 py-1 rounded hover:bg-court-bg transition"
            >
              <span>{h.result === "success" ? "✅" : "❌"}</span>
              <span className="text-gray-400 shrink-0">{h.date}</span>
              <span className="truncate">{h.taskText}</span>
              {h.imageData && <span className="shrink-0 text-court-gold">📷</span>}
            </button>
          ))}
        </div>
      </div>

      <button
        onClick={onStart}
        className="px-6 py-4 bg-court-gold text-court-bg font-bold rounded-lg text-lg"
      >
        今日の課題を始める
      </button>
      <button onClick={onEditHabits} className="text-sm text-gray-400 underline">
        サボり癖を編集する
      </button>
    </div>
  );
}
