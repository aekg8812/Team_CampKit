// ========================================
// ローカルストレージ版データストア
// Supabaseなしで全機能が動く。認証もローカルで簡易実装。
// ⚠️ パスワードは簡易ハッシュのみ。デモ用。
// ========================================

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
    habitStreaks: {},
    successCount: 0,
    failCount: 0,
    history: [],
    notifyEmail: null,
    lastLoginAt: null,
    emailLog: [],
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
  return users[username]?.data || freshData();
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
      data.habitStreaks[id] = { current: 0, best: 0, level: 1 };
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
    data.habitStreaks[habitId] = { current: 0, best: 0, level: 1 };
  }
  const s = data.habitStreaks[habitId];

  if (result === "success") {
    data.successCount += 1;
    s.current += 1;
    if (s.current > s.best) s.best = s.current;
    s.level = Math.min(3, s.level + 1);
  } else {
    data.failCount += 1;
    s.current = 0;
  }

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
