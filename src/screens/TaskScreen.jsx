import { useEffect, useState } from "react";
import { LEVEL_LABEL } from "../data/tasksByHabit";
import { judgeEvidence } from "../lib/claude";

// 課題提示 + カウントダウン + 証拠提出（画像/コメント）
export default function TaskScreen({ task, onSuccess, onFail }) {
  const [remaining, setRemaining] = useState(secondsUntilMidnight());
  const [comment, setComment] = useState("");
  const [imageData, setImageData] = useState(null); // { base64, mediaType, preview }
  const [judging, setJudging] = useState(false);
  const [judgeMsg, setJudgeMsg] = useState("");

  const style = LEVEL_LABEL[task.level];

  // カウントダウン
  useEffect(() => {
    const timer = setInterval(() => {
      const s = secondsUntilMidnight();
      setRemaining(s);
      if (s <= 0) {
        clearInterval(timer);
        onFail();
      }
    }, 1000);
    return () => clearInterval(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 画像選択
  function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result; // data:image/xxx;base64,....
      const base64 = result.split(",")[1];
      const mediaType = file.type || "image/jpeg";
      setImageData({ base64, mediaType, preview: result });
    };
    reader.readAsDataURL(file);
  }

  // 完了ボタン（画像があれば判定、なければ自己申告）
  async function handleComplete() {
    setJudging(true);
    setJudgeMsg("");

    if (imageData) {
      const r = await judgeEvidence({
        base64: imageData.base64,
        mediaType: imageData.mediaType,
        taskText: task.text,
      });
      setJudgeMsg(r.message);
      if (r.ok) {
        setTimeout(() => onSuccess({ comment, withEvidence: true }), 800);
        return;
      }
      // NG時は再提出を促す
      setJudging(false);
      return;
    }

    // 画像なし＝自己申告（コメント必須）
    if (!comment.trim()) {
      setJudgeMsg("コメントを入力するか、写真を提出してください");
      setJudging(false);
      return;
    }
    onSuccess({ comment, withEvidence: false });
  }

  return (
    <div className="court-frame flex flex-col items-center gap-5 py-6">
      <p className="text-sm text-gray-400">今日の課題</p>
      <div
        className="w-full py-6 px-4 rounded-xl border-2 text-center"
        style={{ borderColor: style.color }}
      >
        <p className="text-xs mb-2" style={{ color: style.color }}>
          {style.label}
        </p>
        <p className="text-2xl font-extrabold">{task.text}</p>
      </div>

      <p className="text-4xl font-mono tracking-wider">{formatTime(remaining)}</p>
      <p className="text-xs text-gray-500 -mt-3">今日中（23:59まで）に達成しよう</p>

      {/* 証拠提出 */}
      <div className="w-full bg-court-panel rounded-xl p-4 flex flex-col gap-3">
        <p className="text-sm font-bold">証拠を提出（任意）</p>

        {imageData ? (
          <div className="flex flex-col items-center gap-2">
            <img
              src={imageData.preview}
              alt="証拠"
              className="max-h-40 rounded-lg object-contain"
            />
            <button
              onClick={() => setImageData(null)}
              className="text-xs text-gray-400 underline"
            >
              画像を取り消す
            </button>
          </div>
        ) : (
          <label className="px-4 py-3 bg-court-bg rounded-lg text-center text-sm cursor-pointer border border-gray-700">
            写真を撮る / 選ぶ
            <input
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleImage}
              className="hidden"
            />
          </label>
        )}

        <textarea
          className="px-3 py-2 bg-court-bg rounded-lg text-sm border border-gray-700 outline-none focus:border-court-gold resize-none"
          rows={2}
          placeholder="一言コメント（写真なしの場合は必須）"
          value={comment}
          onChange={(e) => setComment(e.target.value)}
        />
      </div>

      {judgeMsg && <p className="text-sm text-court-mid text-center">{judgeMsg}</p>}

      <button
        onClick={handleComplete}
        disabled={judging}
        className="w-full px-6 py-4 bg-court-gold text-court-bg font-bold rounded-lg disabled:opacity-50"
      >
        {judging ? "確認中…" : "完了する"}
      </button>
    </div>
  );
}

function secondsUntilMidnight() {
  const now = new Date();
  const midnight = new Date(now);
  midnight.setHours(23, 59, 0, 0);
  return Math.max(0, Math.floor((midnight - now) / 1000));
}

function formatTime(s) {
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}
