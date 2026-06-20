import { motion } from "framer-motion";
import { AI_MODE } from "../lib/ai/index";

export default function DiagnosisScreen({ diagnosis, onNext }) {
  const loading = !diagnosis;
  const aiLabel = AI_MODE.label;

  return (
    <div className="court-frame flex flex-col gap-6 justify-center min-h-screen py-8">
      <p className="text-xs text-court-gold font-semibold tracking-widest uppercase text-center">
        サボり傾向診断
      </p>

      {loading ? (
        <div className="flex flex-col items-center gap-5 py-16">
          <div className="relative w-12 h-12">
            <div className="absolute inset-0 rounded-full border-2 border-court-panel2" />
            <div className="absolute inset-0 rounded-full border-2 border-court-gold border-t-transparent animate-spin" />
          </div>
          <div className="text-center">
            <p className="text-sm font-semibold">
              {aiLabel ? `${aiLabel} が分析中…` : "分析中…"}
            </p>
            {aiLabel && (
              <p className="text-xs text-court-muted mt-1">課題も同時に生成しています</p>
            )}
          </div>
        </div>
      ) : (
        <>
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ type: "spring", stiffness: 280, damping: 26 }}
            className="bg-court-panel rounded-3xl p-6"
            style={{ boxShadow: "0 4px 28px rgba(0,0,0,0.55), 0 0 0 1px rgba(255,255,255,0.06)" }}
          >
            <p className="text-base leading-relaxed text-gray-200">{diagnosis}</p>
            {aiLabel && (
              <p className="text-xs text-court-muted text-right mt-4">⚡ {aiLabel} 診断</p>
            )}
          </motion.div>

          <motion.button
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            onClick={onNext}
            whileTap={{ scale: 0.97 }}
            className="w-full py-4 bg-court-gold text-court-bg font-bold rounded-3xl"
            style={{ boxShadow: "0 4px 20px rgba(201,162,39,0.3)" }}
          >
            課題へ進む
          </motion.button>
        </>
      )}
    </div>
  );
}
