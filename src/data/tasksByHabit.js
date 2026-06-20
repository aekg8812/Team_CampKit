// ========================================
// カテゴリ別・レベル別の課題データ
// レベル1（軽い）→ レベル3（重い）
// penaltyLevel 1〜10 で制限時間を制御する（penaltyTime.js 参照）
//   低め（1〜4）: 一度やれば終わる短時間作業
//   高め（7〜10）: 一日を通して守る・翌朝確認など長期課題
// ========================================

import { rollUltra, rollTaskLevel, ULTRA_TASK } from "./levelProbability";

export const TASKS_BY_HABIT = {
  sns: {
    1: [
      { text: "寝る1時間前にスマホを置く",       penaltyLevel: 9 },
      { text: "通知を3時間オフにする",            penaltyLevel: 7 },
      { text: "SNSアプリを1時間開かない",         penaltyLevel: 5 },
    ],
    2: [
      { text: "今夜のスクリーンタイムを2時間以内に", penaltyLevel: 10 },
      { text: "夕食中はスマホを別室に置く",         penaltyLevel: 8 },
      { text: "寝室にスマホを持ち込まない",          penaltyLevel: 9 },
    ],
    3: [
      { text: "今日の残り時間スマホを30分以内に",  penaltyLevel: 10 },
      { text: "SNSアプリを1日封印する",           penaltyLevel: 10 },
      { text: "デジタルデトックス半日",            penaltyLevel: 9  },
    ],
  },
  room: {
    1: [
      { text: "机の上を5分片付ける",         penaltyLevel: 1 },//4
      { text: "床の物を3つ片付ける",          penaltyLevel: 1 },//3
      { text: "ゴミを1袋まとめる",            penaltyLevel: 1 },//3
    ],
    2: [
      { text: "1部屋に掃除機をかける",        penaltyLevel: 4 },
      { text: "散らかった一角を完全に片付ける", penaltyLevel: 5 },
      { text: "洗濯物を畳んでしまう",          penaltyLevel: 4 },
    ],
    3: [
      { text: "部屋全体を掃除する",            penaltyLevel: 6 },
      { text: "不要な物を10個処分する",        penaltyLevel: 5 },
      { text: "水回りを掃除する",              penaltyLevel: 5 },
    ],
  },
  exercise: {
    1: [
      { text: "スクワット10回",   penaltyLevel: 4 },
      { text: "5分散歩する",     penaltyLevel: 4 },
      { text: "ストレッチ5分",   penaltyLevel: 3 },
    ],
    2: [
      { text: "腹筋20回",         penaltyLevel: 4 },
      { text: "外を15分歩く",     penaltyLevel: 4 },
      { text: "スクワット20回",   penaltyLevel: 4 },
    ],
    3: [
      { text: "腹筋30回",         penaltyLevel: 4 },
      { text: "30分のウォーキング", penaltyLevel: 5 },
      { text: "筋トレ3種目",       penaltyLevel: 5 },
    ],
  },
  sabo: {
    1: [
      { text: "積んでる本を5ページ読む",  penaltyLevel: 4 },
      { text: "ToDoを1つ片付ける",       penaltyLevel: 5 },
      { text: "5分だけ着手する",          penaltyLevel: 3 },
    ],
    2: [
      { text: "積んでる本を15ページ読む",  penaltyLevel: 5 },
      { text: "後回しタスクを2つ片付ける", penaltyLevel: 6 },
      { text: "30分集中して進める",        penaltyLevel: 5 },
    ],
    3: [
      { text: "一番避けてるタスクを終わらせる", penaltyLevel: 8 },
      { text: "本を1章読み切る",              penaltyLevel: 7 },
      { text: "溜めた作業を1時間進める",       penaltyLevel: 6 },
    ],
  },
  human: {
    1: [
      { text: "未読のメッセージに1件返信", penaltyLevel: 4 },
      { text: "1人に近況を送る",           penaltyLevel: 4 },
      { text: "お礼を1件伝える",           penaltyLevel: 3 },
    ],
    2: [
      { text: "溜まった連絡に3件返信",           penaltyLevel: 5 },
      { text: "気まずくて放置してた人に連絡",     penaltyLevel: 5 },
      { text: "謝りたかった件を片付ける",         penaltyLevel: 5 },
    ],
    3: [
      { text: "未読を全部返す",             penaltyLevel: 6 },
      { text: "ずっと連絡してない人に電話", penaltyLevel: 6 },
      { text: "返信の墓場を一掃する",       penaltyLevel: 7 },
    ],
  },
  morning: {
    1: [
      { text: "明日アラームを1回で起きる",  penaltyLevel: 10 },
      { text: "今日0時前に布団に入る",      penaltyLevel: 10 },
      { text: "夜更かしを30分減らす",       penaltyLevel: 9  },
    ],
    2: [
      { text: "明日いつもより30分早く起きる", penaltyLevel: 10 },
      { text: "23時までに就寝",              penaltyLevel: 9  },
      { text: "二度寝せず起きる",            penaltyLevel: 10 },
    ],
    3: [
      { text: "明日いつもより1時間早く起きる", penaltyLevel: 10 },
      { text: "22時就寝・6時起床",            penaltyLevel: 10 },
      { text: "朝活を1つやる",               penaltyLevel: 10 },
    ],
  },
  meal: {
    1: [
      { text: "今日コップ1杯多く水を飲む",   penaltyLevel: 8 },
      { text: "間食を1回我慢する",            penaltyLevel: 8 },
      { text: "野菜を1品足す",               penaltyLevel: 7 },
    ],
    2: [
      { text: "今日1食を自炊する",            penaltyLevel: 7 },
      { text: "夜食を抜く",                   penaltyLevel: 9 },
      { text: "バランスの取れた食事を1回",    penaltyLevel: 7 },
    ],
    3: [
      { text: "今日3食すべて自炊する",        penaltyLevel: 10 },
      { text: "ジャンクフードを1日断つ",      penaltyLevel: 10 },
      { text: "栄養を考えた献立を作る",       penaltyLevel: 7  },
    ],
  },
};

// 難易度ラベル（色・テキスト）
export const LEVEL_LABEL = {
  1: { label: "レベル1", color: "#4caf50", note: "まずはここから" },
  2: { label: "レベル2", color: "#f5b301", note: "少しずつ強化" },
  3: { label: "レベル3", color: "#e23636", note: "本気モード" },
};

// カテゴリとレベルから課題候補を返す（ガチャ用に複数返す）
// 返り値: [{ id, text, level, penaltyLevel }, ...]
export function getTasksForHabit(habitId, level) {
  const byHabit = TASKS_BY_HABIT[habitId] || TASKS_BY_HABIT.sabo;
  const lv = Math.max(1, Math.min(3, level || 1));
  const tasks = byHabit[lv] || byHabit[1];
  return tasks.map((task, i) => ({
    id: `${habitId}-${lv}-${i}`,
    text: task.text,
    level: lv,
    penaltyLevel: task.penaltyLevel,
  }));
}

// レベル確率抽選と激重抽選を組み合わせて候補を生成する
// App.jsx の handleQuestionComplete / generateTasks フォールバック用
export function buildCandidates(habitId, playerLevel) {
  if (rollUltra()) return [ULTRA_TASK];
  const taskLevel = rollTaskLevel(Math.max(1, Math.min(3, playerLevel || 1)));
  return getTasksForHabit(habitId, taskLevel);
}
