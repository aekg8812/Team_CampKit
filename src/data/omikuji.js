// ============================================================
// おみくじ 確率テーブル・ポイント・コメント定義
// weight の合計は 100 にすること
// ▼ ここの数値・コメントを変えるだけで調整できる ▼
// ============================================================

export const OMIKUJI_TABLE = [
  {
    result: "大吉",
    weight: 5,
    points: 10,
    color: "#f5b301",
    comments: [
      "最高の運気！今日は何でもうまくいく日です！",
      "全力でサボらずに行こう！運が完全に味方してます！",
      "大吉！このチャンスをものにしてください！",
    ],
  },
  {
    result: "吉",
    weight: 10,
    points: 8,
    color: "#4caf50",
    comments: [
      "いい感じ！そのまま続けていきましょう！",
      "運気上昇中！習慣化のビッグチャンスです！",
      "吉！今日の努力が未来の自分を作ります！",
    ],
  },
  {
    result: "中吉",
    weight: 15,
    points: 6,
    color: "#4caf50",
    comments: [
      "まあまあの運勢。コツコツ積み上げていきましょう！",
      "着実に進めば道は開けます！",
      "中吉。焦らず丁寧にやっていきましょう！",
    ],
  },
  {
    result: "小吉",
    weight: 20,
    points: 4,
    color: "#9ca3af",
    comments: [
      "小さな努力が積み重なっていくよ！",
      "地道にやっていこう。それが一番の近道だ！",
      "小吉。今日も1歩前へ！",
    ],
  },
  {
    result: "末吉",
    weight: 35,
    points: 2,
    color: "#9ca3af",
    comments: [
      "まだまだこれから。焦らずいこう！",
      "細かい習慣から変えていこう！",
      "末吉。でも引き続き頑張れ！",
    ],
  },
  {
    result: "大凶",
    weight: 15,
    points: 0,
    color: "#e23636",
    comments: [
      "今日は最悪の日…と思ったのか？違う、お前がサボったせいだ！",
      "大凶！でもそれでも続けるやつが本物だ！逃げるなよ！",
      "最凶。今すぐ課題をやれ。話はそれからだ。",
    ],
  },
];

/**
 * ランダムにおみくじ結果を1つ引く
 * @returns {{ result, weight, points, color, comment }}
 */
export function drawOmikuji() {
  const total = OMIKUJI_TABLE.reduce((s, r) => s + r.weight, 0);
  let roll = Math.random() * total;
  for (const entry of OMIKUJI_TABLE) {
    roll -= entry.weight;
    if (roll <= 0) {
      const comment = entry.comments[Math.floor(Math.random() * entry.comments.length)];
      return { ...entry, comment };
    }
  }
  // フォールバック（浮動小数点誤差対策）
  const last = OMIKUJI_TABLE[OMIKUJI_TABLE.length - 1];
  return { ...last, comment: last.comments[0] };
}
