// ============================================================
// レベル昇格ルール・課題レベル選択確率・再ガチャ定数
// ▼ ここの数値を変えるだけでゲームバランスが調整できる ▼
// ============================================================

// プレイヤーレベル → 出題課題レベルの重みテーブル（合計100）
export const LEVEL_PROB = {
  1: [{ level: 1, weight: 100 }],
  2: [{ level: 2, weight: 60 }, { level: 1, weight: 40 }],
  3: [{ level: 3, weight: 10 }, { level: 2, weight: 60 }, { level: 1, weight: 30 }],
};

// 連続成功何回でレベルアップするか（失敗でLv1にリセット）
export const LEVEL_UP_THRESHOLD = {
  1: 3, // Lv1 → Lv2: 連続3回
  2: 5, // Lv2 → Lv3: さらに連続5回
};

// 激重課題の出現確率（0〜1、例: 0.01 = 1%）
export const ULTRA_PROB = 0.01;

// 全テーマ共通の激重課題（ULTRA_PROB で当選したら通常課題を上書きする）
export const ULTRA_TASK = {
  id: "ultra",
  text: "スクワット100回（休みなし）",
  level: 3,
  penaltyLevel: 5,
  isUltra: true,
};

// ─── ポイント消費 再ガチャ オプション ───
// cost       : 消費pt
// prob       : この確率でLv1へ下がる（0〜1）
// label      : ボタン表示文字列
export const REGACHA_OPTIONS = [
  { cost: 1, prob: 0.10, label: "1pt — 10%でLv1へ変更" },
  { cost: 3, prob: 0.30, label: "3pt — 30%でLv1へ変更" },
  { cost: 5, prob: 0.50, label: "5pt — 50%でLv1へ変更" },
];

// 課題救済（成功扱い）のコスト
export const RESCUE_COST = 50;

// ─── ヘルパー ───

/** プレイヤーレベルからランダムに課題レベルを1つ選ぶ */
export function rollTaskLevel(playerLevel) {
  const pool = LEVEL_PROB[playerLevel] || LEVEL_PROB[1];
  const roll = Math.random() * 100;
  let cumulative = 0;
  for (const { level, weight } of pool) {
    cumulative += weight;
    if (roll < cumulative) return level;
  }
  return playerLevel;
}

/** 激重課題が当選するかどうかを抽選する */
export function rollUltra() {
  return Math.random() < ULTRA_PROB;
}
