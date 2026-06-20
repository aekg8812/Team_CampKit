import { getHabit } from "../data/habits";
import { isSupabaseMode } from "../store";

// 成功/失敗の円グラフ（SVGで自作・ライブラリ不要）
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
  // 円弧の計算
  const r = 60;
  const cx = 80;
  const cy = 80;
  const circumference = 2 * Math.PI * r;
  const successLen = circumference * successRatio;

  return (
    <div className="flex items-center justify-center gap-6 py-2">
      <svg width="160" height="160" viewBox="0 0 160 160">
        {/* 失敗（赤）を背景全周に */}
        <circle cx={cx} cy={cy} r={r} fill="none" stroke="#e23636" strokeWidth="28" />
        {/* 成功（緑）を上から重ねる */}
        <circle
          cx={cx}
          cy={cy}
          r={r}
          fill="none"
          stroke="#4caf50"
          strokeWidth="28"
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

export default function MyPageScreen({ username, data, onStart, onEditHabits, onLogout }) {
  const { successCount, failCount, habitStreaks, selectedHabits, history } = data;

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

      {/* 円グラフ */}
      <div className="bg-court-panel rounded-xl p-4">
        <p className="text-sm font-bold mb-1">総合成績</p>
        <PieChart success={successCount} fail={failCount} />
      </div>

      {/* カテゴリ別ストリーク */}
      <div className="bg-court-panel rounded-xl p-4">
        <p className="text-sm font-bold mb-3">サボり癖別ストリーク</p>
        <div className="space-y-2">
          {selectedHabits.length === 0 && (
            <p className="text-xs text-gray-500">サボり癖が未選択です</p>
          )}
          {selectedHabits.map((id) => {
            const h = getHabit(id);
            const s = habitStreaks[id] || { current: 0, best: 0, level: 1 };
            return (
              <div key={id} className="flex items-center justify-between text-sm">
                <span>
                  {h.icon} {h.label}
                </span>
                <span className="text-court-gold">
                  連続{s.current}日
                  <span className="text-gray-500 text-xs ml-2">最高{s.best}日 / Lv{s.level}</span>
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {/* 履歴リスト */}
      <div className="bg-court-panel rounded-xl p-4">
        <p className="text-sm font-bold mb-3">クリア履歴</p>
        <div className="space-y-1 max-h-48 overflow-y-auto">
          {history.length === 0 && (
            <p className="text-xs text-gray-500">まだ履歴がありません</p>
          )}
          {history.slice(0, 20).map((h, i) => (
            <div key={i} className="flex items-center gap-2 text-xs">
              <span>{h.result === "success" ? "✅" : "❌"}</span>
              <span className="text-gray-400">{h.date}</span>
              <span className="truncate">{h.taskText}</span>
            </div>
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
