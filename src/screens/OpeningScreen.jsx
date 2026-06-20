import { motion } from "framer-motion";

export default function OpeningScreen({ onStart, criminalRecord }) {
  return (
    <div className="court-frame flex flex-col items-center justify-center text-center gap-8">
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 1 }}
      >
        <p className="text-court-gold tracking-widest text-sm mb-3">AI 予 言 法 廷</p>
        <h1 className="text-3xl font-extrabold leading-relaxed">
          うん、
          <br />
          わかった。
        </h1>
      </motion.div>

      <motion.p
        className="text-sm text-gray-300 leading-relaxed"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1, duration: 1 }}
      >
        あなたのサボり、全部バレてます。
        <br />
        そして今夜何をするかも、もう分かっています。
      </motion.p>

      {criminalRecord > 0 && (
        <p className="text-court-danger text-xs">前科 {criminalRecord} 犯</p>
      )}

      <motion.button
        onClick={onStart}
        className="mt-4 px-10 py-4 bg-court-gold text-court-bg font-bold rounded-lg text-lg"
        whileTap={{ scale: 0.95 }}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.8 }}
      >
        入廷する
      </motion.button>
    </div>
  );
}
