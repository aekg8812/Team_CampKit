import { motion } from "framer-motion";

export default function ResultScreen({ success, onBackToMyPage }) {
  return (
    <div className="court-frame flex flex-col items-center justify-center text-center gap-6">
      {success ? (
        <>
          <motion.h2
            initial={{ scale: 0.5, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-extrabold text-court-low"
          >
            達成！
          </motion.h2>
          <p className="text-lg">今日のサボり癖を1つ乗り越えました</p>
          <p className="text-sm text-gray-400">連続記録が伸びました</p>
        </>
      ) : (
        <>
          <motion.h2
            initial={{ scale: 1.3, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-3xl font-extrabold text-court-danger"
          >
            時間切れ
          </motion.h2>
          <p className="text-sm text-gray-400">また明日チャレンジしましょう</p>
        </>
      )}

      <button
        onClick={onBackToMyPage}
        className="mt-4 px-8 py-3 bg-court-gold text-court-bg font-bold rounded-lg"
      >
        マイページへ
      </button>
    </div>
  );
}
