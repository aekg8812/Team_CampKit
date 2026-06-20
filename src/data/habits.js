// ========================================
// サボり癖カテゴリの定義
// ここを編集すればカテゴリの増減ができる
// ========================================

export const HABITS = [
  { id: "sns", label: "スマホ・SNS依存", icon: "📱" },
  { id: "room", label: "部屋の汚さ・掃除嫌い", icon: "🧹" },
  { id: "exercise", label: "運動不足", icon: "🏃" },
  { id: "sabo", label: "先延ばし・積読", icon: "📚" },
  { id: "human", label: "連絡の後回し", icon: "💬" },
  { id: "morning", label: "早起きができない", icon: "⏰" },
  { id: "meal", label: "自炊しない・食生活の乱れ", icon: "🍳" },
];

// idからカテゴリ情報を引く
export function getHabit(id) {
  return HABITS.find((h) => h.id === id) || { id, label: id, icon: "❓" };
}
