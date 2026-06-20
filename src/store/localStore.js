// ========================================
// ローカルストレージ版データストア（A案）
// Firebaseなしで全機能が動く。認証もローカルで簡易実装。
// ⚠️ パスワードは簡易ハッシュのみ。本番品質ではないがデモには十分。
// ========================================

const USERS_KEY = "sabori_users"; // { username: { passHash, data } }
const SESSION_KEY = "sabori_session"; // ログイン中のusername

// 超簡易ハッシュ（デモ用。本番では使わないこと）
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

// 新規ユーザーの初期データ
function freshData() {
  return {
    selectedHabits: [],
    habitStreaks: {}, // { sns: { current, best, level } }
    successCount: 0,
    failCount: 0,
    history: [], // { date, habitId, taskText, result: "success"|"fail", comment }
  };
}

// ───────── 認証 ─────────

export function registerLocal(username, password) {
  const users = loadUsers();
  if (users[username]) {
    return { ok: false, error: "そのユーザー名は既に使われています" };
  }
  users[username] = { passHash: simpleHash(password), data: freshData() };
  saveUsers(users);
  return { ok: true };
}

export function loginLocal(username, password) {
  const users = loadUsers();
  const u = users[username];
  if (!u) return { ok: false, error: "ユーザーが見つかりません" };
  if (u.passHash !== simpleHash(password)) {
    return { ok: false, error: "パスワードが違います" };
  }
  localStorage.setItem(SESSION_KEY, username);
  return { ok: true };
}

// パスワード再設定（ユーザー名 + 新パスワード）
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

// サボり癖の選択を保存
export function saveSelectedHabitsLocal(username, habitIds) {
  const data = getUserDataLocal(username);
  data.selectedHabits = habitIds;
  // 新規カテゴリのストリークを初期化
  habitIds.forEach((id) => {
    if (!data.habitStreaks[id]) {
      data.habitStreaks[id] = { current: 0, best: 0, level: 1 };
    }
  });
  setUserDataLocal(username, data);
  return data;
}

// 1回分の結果を記録（成功/失敗）
export function recordResultLocal(username, { habitId, taskText, result, comment }) {
  const data = getUserDataLocal(username);
  const today = new Date().toISOString().slice(0, 10);

  data.history.unshift({ date: today, habitId, taskText, result, comment: comment || "" });

  if (!data.habitStreaks[habitId]) {
    data.habitStreaks[habitId] = { current: 0, best: 0, level: 1 };
  }
  const s = data.habitStreaks[habitId];

  if (result === "success") {
    data.successCount += 1;
    s.current += 1;
    if (s.current > s.best) s.best = s.current;
    // 成功したらレベルを上げる（最大3）
    s.level = Math.min(3, s.level + 1);
  } else {
    data.failCount += 1;
    s.current = 0; // ストリークが切れる
    // 失敗時はレベルを上げない（据え置き）
  }

  setUserDataLocal(username, data);
  return data;
}
