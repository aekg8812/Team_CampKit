import { motion } from "framer-motion";

export default function DiagnosisScreen({ diagnosis, onNext }) {
  const loading = !diagnosis;

  return (
    <div className="court-frame flex flex-col items-center gap-6 justify-center py-8">
      <p className="text-xs text-court-gold tracking-widest">⚖ サボり傾向診断</p>

      {loading ? (
        <div className="flex flex-col items-center gap-4 py-12">
          <div className="w-8 h-8 border-2 border-court-gold border-t-transparent rounded-full animate-spin" />
          <p className="text-sm text-gray-400">分析中…</p>
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="w-full bg-court-panel rounded-xl p-6"
          >
            <p className="text-base leading-relaxed">{diagnosis}</p>
          </motion.div>
          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            onClick={onNext}
            className="w-full px-6 py-4 bg-court-gold text-court-bg font-bold rounded-lg"
          >
            課題へ進む
          </motion.button>
        </>
      )}
    </div>
  );
}
