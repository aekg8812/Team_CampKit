// ========================================
// Supabase版データストア
// VITE_USE_SUPABASE=true のときだけ使われる
// ========================================

import { supabase } from "../lib/supabase";
import { LEVEL_UP_THRESHOLD } from "../data/levelProbability";

function toEmail(username) {
  return `${username}@sabori-app.local`;
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
    lastLogAt: null,
    emailLog: [],
    points: 0,
    dailyPointsDate: null,
    dailyPointsAwarded: 0,
    lastOmikujiDate: null,
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

// DBの行(snake_case) → アプリ用オブジェクト(camelCase)
function rowToData(row) {
  if (!row) return freshData();
  const base = freshData();
  return {
    selectedHabits:    row.selected_habits    ?? base.selectedHabits,
    habitStreaks:      row.habit_streaks       ?? base.habitStreaks,
    successCount:      row.success_count       ?? base.successCount,
    failCount:         row.fail_count          ?? base.failCount,
    history:           row.history             ?? base.history,
    notifyEmail:       row.notify_email        ?? base.notifyEmail,
    lastLoginAt:       row.last_login_at       ?? base.lastLoginAt,
    lastLogAt:         row.last_log_at         ?? base.lastLogAt,
    emailLog:          row.email_log           ?? base.emailLog,
    points:            row.points              ?? base.points,
    dailyPointsDate:   row.daily_points_date   ?? base.dailyPointsDate,
    dailyPointsAwarded:row.daily_points_awarded?? base.dailyPointsAwarded,
    lastOmikujiDate:   row.last_omikuji_date   ?? base.lastOmikujiDate,
  };
}

// ───────── 認証 ─────────

export async function registerSb(username, password, notifyEmail) {
  const { data, error } = await supabase.auth.signUp({
    email: toEmail(username),
    password,
  });
  if (error) return { ok: false, error: sbError(error) };

  const uid = data.user?.id;
  if (uid) {
    await supabase.from("user_data").insert({
      id: uid,
      selected_habits: [],
      habit_streaks: {},
      success_count: 0,
      fail_count: 0,
      history: [],
      notify_email: notifyEmail || null,
      email_log: [],
      points: 0,
      daily_points_date: null,
      daily_points_awarded: 0,
      last_omikuji_date: null,
    });
  }
  return { ok: true };
}

export async function loginSb(username, password) {
  const { error } = await supabase.auth.signInWithPassword({
    email: toEmail(username),
    password,
  });
  if (error) return { ok: false, error: sbError(error) };
  return { ok: true };
}

export async function logoutSb() {
  await supabase.auth.signOut();
}

export async function resetPasswordSb() {
  return { ok: false, error: "Supabaseモードではパスワード再設定は未対応です" };
}

export async function getCurrentUidSb() {
  const { data: { session } } = await supabase.auth.getSession();
  return session?.user?.id || null;
}

export async function getCurrentUsernameSb() {
  const { data: { session } } = await supabase.auth.getSession();
  const email = session?.user?.email || "";
  return email.replace("@sabori-app.local", "") || null;
}

// ───────── データ読み書き ─────────

export async function getUserDataSb() {
  const uid = await getCurrentUidSb();
  if (!uid) return freshData();

  const { data } = await supabase
    .from("user_data")
    .select("*")
    .eq("id", uid)
    .single();

  return rowToData(data);
}

export async function saveSelectedHabitsSb(habitIds) {
  const uid = await getCurrentUidSb();
  if (!uid) return;

  const current = await getUserDataSb();
  current.selectedHabits = habitIds;
  habitIds.forEach((id) => {
    if (!current.habitStreaks[id]) {
      current.habitStreaks[id] = { currentStreak: 0, best: 0, level: 1, totalFail: 0 };
    } else {
      current.habitStreaks[id] = normalizeStreak(current.habitStreaks[id]);
    }
  });

  await supabase.from("user_data").upsert({
    id: uid,
    selected_habits: current.selectedHabits,
    habit_streaks: current.habitStreaks,
    success_count: current.successCount,
    fail_count: current.failCount,
    history: current.history,
    updated_at: new Date().toISOString(),
  });

  return current;
}

// 結果記録（成功/失敗）。imageData は縮小済み data URL or null
export async function recordResultSb({ habitId, taskText, result, comment, imageData, durationSec }) {
  const uid = await getCurrentUidSb();
  if (!uid) return;

  const data = await getUserDataSb();
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
    const threshold = LEVEL_UP_THRESHOLD[s.level];
    if (threshold && s.currentStreak >= threshold && s.level < 3) {
      s.level += 1;
      s.currentStreak = 0;
    }

    // ポイント付与：1日3pt上限（おみくじ報酬は別枠）
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
    s.level = 1;
  }

  data.habitStreaks[habitId] = s;
  const nowIso = new Date().toISOString();
  data.lastLogAt = nowIso;

  await supabase.from("user_data").upsert({
    id: uid,
    selected_habits: data.selectedHabits,
    habit_streaks: data.habitStreaks,
    success_count: data.successCount,
    fail_count: data.failCount,
    history: data.history,
    points: data.points,
    daily_points_date: data.dailyPointsDate,
    daily_points_awarded: data.dailyPointsAwarded,
    last_log_at: nowIso,
    updated_at: nowIso,
  });

  return data;
}

// 最終ログイン時刻を現在時刻で更新する
export async function updateLastLoginSb() {
  const uid = await getCurrentUidSb();
  if (!uid) return;
  await supabase
    .from("user_data")
    .update({ last_login_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq("id", uid);
}

// メール送信ログを追記する
export async function addEmailLogSb(entry) {
  const uid = await getCurrentUidSb();
  if (!uid) return;
  const data = await getUserDataSb();
  const emailLog = [...(data.emailLog || []), entry];
  await supabase
    .from("user_data")
    .update({ email_log: emailLog, updated_at: new Date().toISOString() })
    .eq("id", uid);
}

// ポイントを消費する
export async function spendPointsSb(amount) {
  const uid = await getCurrentUidSb();
  if (!uid) return;
  const data = await getUserDataSb();
  data.points = Math.max(0, (data.points || 0) - amount);
  await supabase
    .from("user_data")
    .update({ points: data.points, updated_at: new Date().toISOString() })
    .eq("id", uid);
  return data;
}

// おみくじ結果を記録し、ポイントを加算する（1日上限の対象外）
export async function recordOmikujiSb(points) {
  const uid = await getCurrentUidSb();
  if (!uid) return;
  const data = await getUserDataSb();
  const today = new Date().toISOString().slice(0, 10);
  data.points = (data.points || 0) + points;
  data.lastOmikujiDate = today;
  await supabase
    .from("user_data")
    .update({
      points: data.points,
      last_omikuji_date: today,
      updated_at: new Date().toISOString(),
    })
    .eq("id", uid);
  return data;
}

function sbError(error) {
  const msg = error?.message || "";
  if (msg.includes("User already registered")) return "そのユーザー名は既に使われています";
  if (msg.includes("Invalid login credentials")) return "ユーザー名またはパスワードが違います";
  if (msg.includes("Password should be") || msg.includes("should be at least"))
    return "パスワードは6文字以上にしてください";
  return "エラーが発生しました（" + msg + "）";
}
