import { motion } from "framer-motion";

export default function ResultScreen({ success, onBackToMyPage }) {
  return (
    <div className="court-frame flex flex-col items-center justify-center text-center gap-6 min-h-screen">
      {success ? (
        <>
          <motion.div
            initial={{ scale: 0.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 220, damping: 16 }}
            className="text-7xl"
          >
            🎉
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-extrabold text-court-low"
          >
            達成！
          </motion.h2>
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26, delay: 0.35 }}
            className="bg-court-panel rounded-3xl px-6 py-5 text-sm text-gray-300 leading-relaxed"
            style={{ boxShadow: "0 4px 28px rgba(0,0,0,0.5), 0 0 0 1px rgba(255,255,255,0.06)" }}
          >
            <p>今日のサボり癖を1つ乗り越えました</p>
            <p className="mt-1">連続記録が更新されました 🔥</p>
          </motion.div>
        </>
      ) : (
        <>
          <motion.div
            initial={{ scale: 1.4, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", stiffness: 200 }}
            className="text-6xl"
          >
            ⏰
          </motion.div>
          <motion.h2
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-3xl font-extrabold text-court-danger"
          >
            時間切れ
          </motion.h2>
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.35 }}
            className="text-sm text-court-muted"
          >
            また明日チャレンジしましょう
          </motion.p>
        </>
      )}

      <motion.button
        onClick={onBackToMyPage}
        whileTap={{ scale: 0.97 }}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="mt-4 px-10 py-4 bg-court-gold text-court-bg font-bold rounded-3xl"
        style={{ boxShadow: "0 4px 20px rgba(201,162,39,0.3)" }}
      >
        マイページへ
      </motion.button>
    </div>
  );
}
