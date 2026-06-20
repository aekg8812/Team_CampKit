// ========================================
// 第三者メール通知
// Supabase Edge Function "send-penalty-email" → GAS → Gmail で送信する
// 送信失敗時は try/catch で握りつぶしてアプリを止めない
// ========================================

import { supabase } from "./supabase";

// ─── 送信関数 ───

/**
 * 課題失敗通知（type:1）を送る
 * テーマの累計失敗が3の倍数に達したときに呼ぶ
 */
export async function sendPenaltyEmail({ toEmail, targetName, taskName }) {
  try {
    await supabase.functions.invoke("send-penalty-email", {
      body: { toEmail, targetName, taskName, type: 1 },
    });
  } catch (e) {
    console.error("[email] sendPenaltyEmail failed:", e);
  }
}

/**
 * 3日放置通知（type:2）を送る
 * 最終ログ記録から72時間以上経過したときに呼ぶ
 */
export async function sendAbsenceEmail({ toEmail, targetName }) {
  try {
    await supabase.functions.invoke("send-penalty-email", {
      body: { toEmail, targetName, type: 2 },
    });
  } catch (e) {
    console.error("[email] sendAbsenceEmail failed:", e);
  }
}

// ─── 送信条件の判定 ───

/**
 * 条件A: テーマ別累計失敗回数が3の倍数かつ未送信のとき true
 * @param {object} data   - getUserData() の戻り値
 * @param {string} habitId - 対象テーマID
 */
export function shouldSendPenaltyEmail(data, habitId) {
  const { notifyEmail, emailLog = [], habitStreaks = {} } = data;
  if (!notifyEmail) return false;
  const streak = habitStreaks[habitId] || {};
  const totalFail = streak.totalFail || 0;
  if (totalFail === 0 || totalFail % 3 !== 0) return false;
  // この habitId × この totalFail で送信済みならスキップ
  const alreadySent = emailLog.some(
    (e) => e.reason === "fail" && e.habitId === habitId && e.failCountAtSend === totalFail
  );
  return !alreadySent;
}

/**
 * 条件B: 最終ログ記録から72時間以上経過 かつ 直近72時間以内に未送信のとき true
 */
export function shouldSendAbsenceEmail(data) {
  const { notifyEmail, lastLogAt, emailLog = [] } = data;
  if (!notifyEmail || !lastLogAt) return false;
  const hoursSinceLast = (Date.now() - new Date(lastLogAt).getTime()) / (1000 * 3600);
  if (hoursSinceLast < 72) return false;
  // 直近72hに inactive メールを送っていないか
  const limit = new Date(Date.now() - 72 * 60 * 60 * 1000).toISOString();
  const sentRecently = emailLog.some((e) => e.reason === "inactive" && e.sentAt >= limit);
  return !sentRecently;
}

// ─── ログエントリ生成 ───

/**
 * emailLog に追加するエントリを作る
 * @param {{ reason: 'fail'|'inactive', habitId?: string, failCountAtSend?: number }}
 */
export function makeEmailLogEntry({ reason, habitId = null, failCountAtSend = null }) {
  return {
    sentAt: new Date().toISOString(),
    reason,
    habitId,
    failCountAtSend,
  };
}
