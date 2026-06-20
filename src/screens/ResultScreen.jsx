import { motion } from "framer-motion";

export default function ResultScreen({ cleared, record, onRestart }) {
  // record = { criminalRecord, totalVerdicts, predictionHits }
  const hitRate =
    record.totalVerdicts > 0
      ? Math.round((record.predictionHits / record.totalVerdicts) * 100)
      : 0;

  return (
    <div className="court-frame flex flex-col items-center justify-center text-center gap-6">
      {cleared ? (
        <>
          <motion.h2
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-extrabold text-court-gold"
          >
            予言を覆しました
          </motion.h2>
          <p className="text-lg">今日の運勢：★★★★★</p>
          <p className="text-sm text-gray-400">前科：変わらず {record.criminalRecord} 犯</p>
        </>
      ) : (
        <>
          <motion.h2
            initial={{ scale: 1.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-2xl font-extrabold text-court-danger"
          >
            予言的中。AIの勝ちです。
          </motion.h2>
          <p className="text-sm text-court-danger">
            前科：+1 → {record.criminalRecord} 犯
          </p>
          <p className="text-xs text-gray-400">明日の難易度が上がります</p>
        </>
      )}

      <p className="text-xs text-gray-500">AI予言的中率：{hitRate}%</p>

      <button
        onClick={onRestart}
        className="mt-4 px-8 py-3 border border-court-gold text-court-gold rounded-lg"
      >
        もう一度入廷する
      </button>
    </div>
  );
}
