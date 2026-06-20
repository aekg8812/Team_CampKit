// ========================================
// ローカルストレージ版データストア
// Supabaseなしで全機能が動く。認証もローカルで簡易実装。
// ⚠️ パスワードは簡易ハッシュのみ。デモ用。
// ========================================

import { LEVEL_UP_THRESHOLD } from "../data/levelProbability";

const USERS_KEY = "sabori_users"; // { username: { passHash, data } }
const SESSION_KEY = "sabori_session";

function simpleHash(str) {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (h << 5) - h + str.charCodeAt(i);
    h |= 0;
  }
  return String(h);
}

function loadUsers() {
  try {
    return JSON.parse(localStorage.getItem(USERS_KEY)) || {};
  } catch {
    return {};
  }
}
function saveUsers(users) {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function freshData() {
  return {
    selectedHabits: [],
    habitStreaks: {},     // { [habitId]: { currentStreak, best, level, totalFail } }
    successCount: 0,
    failCount: 0,
    history: [],
    notifyEmail: null,
    lastLoginAt: null,
    lastLogAt: null,       // 最終ログ記録日時（課題成功/失敗を記録するたびに更新）
    emailLog: [],
    points: 0,             // 保有ポイント
    dailyPointsDate: null, // 今日のポイント付与基準日（YYYY-MM-DD）
    dailyPointsAwarded: 0, // 今日付与済みポイント数（上限3pt/日）
    lastOmikujiDate: null, // おみくじを最後に引いた日（YYYY-MM-DD）
  };
}

// habitStreak を初期化・マイグレーションする（旧 current → currentStreak）
function normalizeStreak(s) {
  if (!s) return { currentStreak: 0, best: 0, level: 1, totalFail: 0 };
  return {
    currentStreak: s.currentStreak ?? s.current ?? 0,
    best: s.best ?? 0,
    level: s.level ?? 1,
    totalFail: s.totalFail ?? 0,
  };
}

// ───────── 認証 ─────────

export function registerLocal(username, password, notifyEmail) {
  const users = loadUsers();
  if (users[username]) return { ok: false, error: "そのユーザー名は既に使われています" };
  const data = freshData();
  data.notifyEmail = notifyEmail || null;
  users[username] = { passHash: simpleHash(password), data };
  saveUsers(users);
  return { ok: true };
}

export function loginLocal(username, password) {
  const users = loadUsers();
  const u = users[username];
  if (!u) return { ok: false, error: "ユーザーが見つかりません" };
  if (u.passHash !== simpleHash(password)) return { ok: false, error: "パスワードが違います" };
  localStorage.setItem(SESSION_KEY, username);
  return { ok: true };
}

export function resetPasswordLocal(username, newPassword) {
  const users = loadUsers();
  if (!users[username]) return { ok: false, error: "ユーザーが見つかりません" };
  users[username].passHash = simpleHash(newPassword);
  saveUsers(users);
  return { ok: true };
}

export function logoutLocal() {
  localStorage.removeItem(SESSION_KEY);
}

export function getSessionLocal() {
  return localStorage.getItem(SESSION_KEY);
}

// ───────── データ読み書き ─────────

export function getUserDataLocal(username) {
  const users = loadUsers();
  const raw = users[username]?.data || freshData();
  // 旧データとの互換性を保つため freshData のフィールドで補完する
  const base = freshData();
  return { ...base, ...raw };
}

function setUserDataLocal(username, data) {
  const users = loadUsers();
  if (!users[username]) return;
  users[username].data = data;
  saveUsers(users);
}

export function saveSelectedHabitsLocal(username, habitIds) {
  const data = getUserDataLocal(username);
  data.selectedHabits = habitIds;
  habitIds.forEach((id) => {
    if (!data.habitStreaks[id]) {
      data.habitStreaks[id] = { currentStreak: 0, best: 0, level: 1, totalFail: 0 };
    } else {
      data.habitStreaks[id] = normalizeStreak(data.habitStreaks[id]);
    }
  });
  setUserDataLocal(username, data);
  return data;
}

// 結果記録（成功/失敗）。imageData は縮小済み data URL or null
export function recordResultLocal(username, { habitId, taskText, result, comment, imageData, durationSec }) {
  const data = getUserDataLocal(username);
  const today = new Date().toISOString().slice(0, 10);

  data.history.unshift({
    date: today,
    habitId,
    taskText,
    result,
    comment: comment || "",
    imageData: imageData || null,
    durationSec: durationSec ?? null,
  });

  if (!data.habitStreaks[habitId]) {
    data.habitStreaks[habitId] = { currentStreak: 0, best: 0, level: 1, totalFail: 0 };
  }
  const s = normalizeStreak(data.habitStreaks[habitId]);

  if (result === "success") {
    data.successCount += 1;
    s.currentStreak += 1;
    if (s.currentStreak > s.best) s.best = s.currentStreak;
    // レベルアップ判定（閾値を超えたらレベルアップ＆連続リセット）
    const threshold = LEVEL_UP_THRESHOLD[s.level];
    if (threshold && s.currentStreak >= threshold && s.level < 3) {
      s.level += 1;
      s.currentStreak = 0;
    }

    // ポイント付与：1日3pt上限
    // ※おみくじ報酬はこの上限に含めない（recordOmikujiLocal で別途加算）
    if (data.dailyPointsDate !== today) {
      data.dailyPointsDate = today;
      data.dailyPointsAwarded = 0;
    }
    if (data.dailyPointsAwarded < 3) {
      data.points = (data.points || 0) + 1;
      data.dailyPointsAwarded += 1;
    }
  } else {
    data.failCount += 1;
    s.totalFail += 1;
    s.currentStreak = 0;
    s.level = 1; // 1回でも失敗したらLv1にリセット
  }

  data.habitStreaks[habitId] = s;
  data.lastLogAt = new Date().toISOString(); // 最終ログ記録日時を更新

  setUserDataLocal(username, data);
  return data;
}

// 最終ログイン時刻を現在時刻で更新する
export function updateLastLoginLocal(username) {
  const users = loadUsers();
  if (!users[username]) return;
  users[username].data = users[username].data || freshData();
  users[username].data.lastLoginAt = new Date().toISOString();
  saveUsers(users);
}

// メール送信ログを追記する
export function addEmailLogLocal(username, entry) {
  const users = loadUsers();
  if (!users[username]) return;
  const data = users[username].data || freshData();
  if (!data.emailLog) data.emailLog = [];
  data.emailLog.push(entry);
  users[username].data = data;
  saveUsers(users);
}

// ポイントを消費する（残高不足時は 0 で止まる）
export function spendPointsLocal(username, amount) {
  const data = getUserDataLocal(username);
  data.points = Math.max(0, (data.points || 0) - amount);
  setUserDataLocal(username, data);
  return data;
}

// おみくじ結果を記録し、ポイントを加算する
// ※おみくじ報酬は1日3pt上限の対象外
export function recordOmikujiLocal(username, points) {
  const data = getUserDataLocal(username);
  const today = new Date().toISOString().slice(0, 10);
  data.points = (data.points || 0) + points;
  data.lastOmikujiDate = today;
  setUserDataLocal(username, data);
  return data;
}
