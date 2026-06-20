import { useState, useEffect } from "react";
import OpeningScreen from "./screens/OpeningScreen";
import InterrogationScreen from "./screens/InterrogationScreen";
import LoadingScreen from "./screens/LoadingScreen";
import GachaScreen from "./screens/GachaScreen";
import VerdictScreen from "./screens/VerdictScreen";
import TimerScreen from "./screens/TimerScreen";
import ResultScreen from "./screens/ResultScreen";

import { selectTasks } from "./lib/probability";
import { generateVerdict } from "./lib/claude";
import {
  getUserId,
  fetchRecord,
  recordVerdict,
  recordCleared,
  recordFailure,
} from "./lib/criminalRecord";

const SCREENS = {
  OPENING: "opening",
  INTERROGATION: "interrogation",
  LOADING: "loading",
  GACHA: "gacha",
  VERDICT: "verdict",
  TIMER: "timer",
  RESULT: "result",
};

export default function App() {
  const [screen, setScreen] = useState(SCREENS.OPENING);
  const [userId] = useState(getUserId());
  const [record, setRecord] = useState({
    criminalRecord: 0,
    totalVerdicts: 0,
    totalCleared: 0,
    predictionHits: 0,
  });

  // 進行中データ
  const [answers, setAnswers] = useState([]);
  const [externalData, setExternalData] = useState(null);
  const [gacha, setGacha] = useState(null); // { candidates, winner }
  const [verdict, setVerdict] = useState(null); // { condemnation, prophecy }
  const [cleared, setCleared] = useState(false);

  // 起動時に前科を読み込む
  useEffect(() => {
    fetchRecord(userId).then(setRecord);
  }, [userId]);

  // ② 尋問完了
  function handleInterrogationDone(allAnswers) {
    setAnswers(allAnswers);
    setScreen(SCREENS.LOADING);
  }

  // ③ ローディング完了 → 確率エンジン → 断罪/予言生成 → ガチャへ
  async function handleLoadingDone(ext) {
    setExternalData(ext);

    // 前半5問だけ確率エンジンに渡す
    const firstHalf = answers.slice(0, 5);
    const result = selectTasks({
      answers: firstHalf,
      weather: ext.weather,
      criminalRecord: record.criminalRecord,
    });
    setGacha(result);

    // 断罪 + 予言を生成
    const answerSummary = answers.map((a, i) => `Q${i + 1}: 選択肢${a + 1}`).join(", ");
    const v = await generateVerdict({
      allAnswers: answerSummary,
      task: result.winner,
      weather: ext.weather,
      weekday: ext.weekday,
      time: ext.time,
      criminalRecord: record.criminalRecord,
    });
    setVerdict(v);

    // 判決を受けた記録
    await recordVerdict(userId);

    setScreen(SCREENS.GACHA);
  }

  // ④ ガチャ完了 → 判決画面
  function handleGachaDone() {
    setScreen(SCREENS.VERDICT);
  }

  // ⑤ 判決画面 → タイマー
  function handleVerdictNext() {
    setScreen(SCREENS.TIMER);
  }

  // ⑥ 執行完了
  async function handleCleared() {
    await recordCleared(userId);
    setCleared(true);
    const updated = await fetchRecord(userId);
    setRecord(updated);
    setScreen(SCREENS.RESULT);
  }

  // ⑥ 執行失敗（タイムアウト）
  async function handleFailed() {
    await recordFailure(userId);
    setCleared(false);
    const updated = await fetchRecord(userId);
    setRecord(updated);
    setScreen(SCREENS.RESULT);
  }

  // ⑦ 最初に戻る
  function handleRestart() {
    setAnswers([]);
    setExternalData(null);
    setGacha(null);
    setVerdict(null);
    setScreen(SCREENS.OPENING);
  }

  switch (screen) {
    case SCREENS.OPENING:
      return (
        <OpeningScreen
          onStart={() => setScreen(SCREENS.INTERROGATION)}
          criminalRecord={record.criminalRecord}
        />
      );
    case SCREENS.INTERROGATION:
      return <InterrogationScreen onComplete={handleInterrogationDone} />;
    case SCREENS.LOADING:
      return (
        <LoadingScreen
          criminalRecord={record.criminalRecord}
          onComplete={handleLoadingDone}
        />
      );
    case SCREENS.GACHA:
      return gacha ? (
        <GachaScreen
          candidates={gacha.candidates}
          winner={gacha.winner}
          onComplete={handleGachaDone}
        />
      ) : null;
    case SCREENS.VERDICT:
      return verdict ? (
        <VerdictScreen verdict={verdict} task={gacha.winner} onNext={handleVerdictNext} />
      ) : (
        <div className="court-frame flex items-center justify-center">
          <p className="text-court-gold animate-flicker">予言を生成中…</p>
        </div>
      );
    case SCREENS.TIMER:
      return (
        <TimerScreen
          task={gacha.winner}
          prophecy={verdict.prophecy}
          onCleared={handleCleared}
          onFailed={handleFailed}
        />
      );
    case SCREENS.RESULT:
      return <ResultScreen cleared={cleared} record={record} onRestart={handleRestart} />;
    default:
      return null;
  }
}
