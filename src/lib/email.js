// ========================================
// 第三者メール通知
// VITE_USE_EMAIL=true のときだけ実際に送信する
// false（既定）では送信内容をモックデータとして返す（画面表示用）
// ========================================

import { supabase } from "./supabase";

const USE_EMAIL = import.meta.env.VITE_USE_EMAIL === "true";

// ───────── 送信条件の判定 ─────────

/**
 * 失敗累計が3の倍数のとき通知すべきか判定する（条件A）
 * - notifyEmail が未登録なら false
 * - この失敗回数で既に送信済みなら false
 * - 1日1通上限を超えるなら false
 */
export function shouldSendFailEmail(data) {
  const { failCount = 0, emailLog = [], notifyEmail } = data;
  if (!notifyEmail) return false;
  if (failCount === 0 || failCount % 3 !== 0) return false;

  // この回数で送信済みならスキップ
  const alreadySent = emailLog.some(
    (e) => e.reason === "fail" && e.failCountAtSend === failCount
  );
  if (alreadySent) return false;

  // 1日1通上限
  return !isWithin24h(emailLog);
}

/**
 * 最終ログインから72時間以上経過していたとき通知すべきか判定する（条件B）
 */
export function shouldSendInactiveEmail(data) {
  const { lastLoginAt, emailLog = [], notifyEmail } = data;
  if (!notifyEmail || !lastLoginAt) return false;

  const hoursSinceLast = (Date.now() - new Date(lastLoginAt).getTime()) / (1000 * 3600);
  if (hoursSinceLast < 72) return false;

  return !isWithin24h(emailLog);
}

function isWithin24h(emailLog) {
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  return emailLog.some((e) => e.sentAt >= dayAgo);
}

// ───────── 送信 ─────────

/**
 * 第三者通知メールを送る、またはモックデータを返す
 * @param {{ to: string, reason: 'fail'|'inactive', username: string, failCount?: number }}
 * @returns {{ sent: boolean, mock: boolean, to: string, subject: string, body: string }}
 */
export async function sendThirdPartyNotification({ to, reason, username, failCount }) {
  const subject =
    reason === "fail"
      ? `【サボり癖クリア】${username}さんが課題に${failCount}回失敗しました`
      : `【サボり癖クリア】${username}さんがアプリを3日間開いていません`;

  const body =
    reason === "fail"
      ? `${username}さんが「サボり癖クリア」の課題に累計${failCount}回失敗しました。\n\n励ましのひと言を送ってあげてください！`
      : `${username}さんが「サボり癖クリア」を3日以上開いていません。\n\nサボっているかもしれません。声をかけてみてください！`;

  if (!USE_EMAIL) {
    return { sent: false, mock: true, to, subject, body };
  }

  try {
    const { error } = await supabase.functions.invoke("notify", {
      body: { to, subject, body },
    });
    if (error) throw error;
    return { sent: true, mock: false, to, subject, body };
  } catch {
    // 失敗時はモック扱いにフォールバック（画面を止めない）
    return { sent: false, mock: true, to, subject, body };
  }
}

/** 送信ログエントリを生成する */
export function makeEmailLogEntry({ reason, failCountAtSend = null }) {
  return {
    sentAt: new Date().toISOString(),
    reason,
    failCountAtSend,
  };
}
