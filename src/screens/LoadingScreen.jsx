import { useEffect, useState } from "react";
import { fetchWeather } from "../lib/weather";

const STEPS = [
  { label: "現在時刻の取得", done: "タイムスタンプ記録完了" },
  { label: "曜日の取得", done: "週間サボりパターンと照合中" },
  { label: "天気APIの取得", done: "本日の天気：記録完了" },
  { label: "前科データの取得", done: "前科確認完了" },
  { label: "予言の生成", done: "予言を生成します" },
];

export default function LoadingScreen({ criminalRecord, onComplete }) {
  const [step, setStep] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let weather;
    const now = new Date();

    async function run() {
      for (let i = 0; i < STEPS.length; i++) {
        if (i === 2) weather = await fetchWeather(); // 天気取得
        if (cancelled) return;
        setStep(i + 1);
        await new Promise((r) => setTimeout(r, 900));
      }
      if (cancelled) return;
      onComplete({
        weather: weather || { description: "晴れ", isRain: false },
        weekday: ["日", "月", "火", "水", "木", "金", "土"][now.getDay()],
        time: `${now.getHours()}時${now.getMinutes()}分`,
        hour: now.getHours(),
      });
    }
    run();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="court-frame flex flex-col justify-center gap-4">
      <p className="text-court-gold mb-4">証拠収集完了。外部データと照合しています…</p>
      {STEPS.map((s, i) => (
        <div key={i} className="font-mono text-sm flex justify-between">
          <span className={i < step ? "text-gray-200" : "text-gray-600"}>・{s.label}</span>
          <span className="text-green-400">
            {i < step ? `→ ${i === 3 ? `前科${criminalRecord}犯 確認完了` : s.done}` : "…"}
          </span>
        </div>
      ))}
    </div>
  );
}
