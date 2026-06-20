import { useEffect, useRef, useState } from "react";
import { LEVEL_LABEL } from "../data/tasksByHabit";
import { getPenaltySeconds } from "../data/penaltyTime";
import { judgeEvidence } from "../lib/claude";

// 課題提示 + カウントダウン + 証拠提出（画像/コメント）
// props:
//   task       : { id, text, level, penaltyLevel }
//   onSuccess  : ({ comment, withEvidence, imageDataUrl, durationSec })
//   onFail     : ({ durationSec })
export default function TaskScreen({ task, onSuccess, onFail }) {
  const penaltySeconds = getPenaltySeconds(task.penaltyLevel);
  const [remaining, setRemaining] = useState(penaltySeconds);
  const [comment, setComment] = useState("");
  const [imageData, setImageData] = useState(null); // { base64, mediaType, preview }
  const [judging, setJudging] = useState(false);
  const [judgeMsg, setJudgeMsg] = useState("");

  const startTimeRef = useRef(Date.now());
  const style = LEVEL_LABEL[task.level];

  // カウントダウン（課題提示からの経過時間）
  useEffect(() => {
    let secs = penaltySeconds;
    const timer = setInterval(() => {
      secs -= 1;
      setRemaining(Math.max(0, secs));
      if (secs <= 0) {
        clearInterval(timer);
        const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);
        onFail({ durationSec });
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
      const result = reader.result;
      const base64 = result.split(",")[1];
      const mediaType = file.type || "image/jpeg";
      setImageData({ base64, mediaType, preview: result });
    };
    reader.readAsDataURL(file);
  }

  // 完了ボタン
  async function handleComplete() {
    setJudging(true);
    setJudgeMsg("");
    const durationSec = Math.floor((Date.now() - startTimeRef.current) / 1000);

    if (imageData) {
      // 画像をサムネイルにリサイズしてから判定・保存
      const thumbnail = await resizeImage(imageData.base64, imageData.mediaType, 480);
      const r = await judgeEvidence({
        base64: thumbnail.split(",")[1],
        mediaType: "image/jpeg",
        taskText: task.text,
      });
      setJudgeMsg(r.message);
      if (r.ok) {
        setTimeout(() => onSuccess({ comment, withEvidence: true, imageDataUrl: thumbnail, durationSec }), 800);
        return;
      }
      setJudging(false);
      return;
    }

    if (!comment.trim()) {
      setJudgeMsg("コメントを入力するか、写真を提出してください");
      setJudging(false);
      return;
    }
    onSuccess({ comment, withEvidence: false, imageDataUrl: null, durationSec });
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
      <p className="text-xs text-gray-500 -mt-3">制限時間内に達成しよう</p>

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

function formatTime(s) {
  const h = String(Math.floor(s / 3600)).padStart(2, "0");
  const m = String(Math.floor((s % 3600) / 60)).padStart(2, "0");
  const sec = String(s % 60).padStart(2, "0");
  return `${h}:${m}:${sec}`;
}

// 証拠画像をサムネイルにリサイズして data URL で返す（容量削減）
function resizeImage(base64, mediaType, maxPx = 480) {
  return new Promise((resolve) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, maxPx / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.7));
    };
    img.onerror = () => resolve(`data:${mediaType};base64,${base64}`);
    img.src = `data:${mediaType};base64,${base64}`;
  });
}
