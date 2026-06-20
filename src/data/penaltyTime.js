// ========================================
// ペナルティ時間テーブル（10段階）
// penaltyLevel 1〜10 それぞれの秒数を定義する
// ▼ ここを編集するだけで全課題の制限時間が変わる ▼
// ========================================

export const PENALTY_SECONDS = {
  1:  30,             // 30秒
  2:  3  * 60,        // 3分
  3:  10 * 60,        // 10分
  4:  30 * 60,        // 30分
  5:  1  * 60 * 60,   // 1時間
  6:  90 * 60,        // 1時間30分
  7:  3  * 60 * 60,   // 3時間
  8:  5  * 60 * 60,   // 5時間
  9:  10 * 60 * 60,   // 10時間
  10: 24 * 60 * 60,   // 24時間（最大）
};

// ★ 検証用：VITE_TIMER_DEBUG=true のときだけ有効。本番は false にすること。
const DEBUG_SECONDS = 10;

/**
 * ペナルティレベル（1〜10）から秒数を返す
 * VITE_TIMER_DEBUG=true のとき全レベルを DEBUG_SECONDS に短縮（検証用）
 * @param {number} level 1〜10
 * @returns {number} 秒数
 */
export function getPenaltySeconds(level) {
  // ★ 検証用短縮スイッチ（ここ1箇所のみ）
  if (import.meta.env.VITE_TIMER_DEBUG === "true") return DEBUG_SECONDS;
  return PENALTY_SECONDS[Math.max(1, Math.min(10, level || 5))] ?? PENALTY_SECONDS[5];
}

/**
 * 秒数を読みやすい表示形式に変換する
 * 例: 90分 → "1時間30分", 3600秒 → "1時間", 30秒 → "30秒"
 * @param {number} secs
 * @returns {string}
 */
export function formatDuration(secs) {
  if (secs == null) return "—";
  const h = Math.floor(secs / 3600);
  const m = Math.floor((secs % 3600) / 60);
  const s = secs % 60;
  if (h > 0 && m > 0) return `${h}時間${m}分`;
  if (h > 0) return `${h}時間`;
  if (m > 0 && s > 0) return `${m}分${s}秒`;
  if (m > 0) return `${m}分`;
  return `${s}秒`;
}
