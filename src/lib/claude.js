// 後方互換のための薄い再エクスポート
// 呼び出し側はこのファイルを import し続けても動く。
// AI実装の本体は src/lib/ai/index.js にある。
export { judgeEvidence, diagnoseAnswers, generateTasks } from "./ai/index";
