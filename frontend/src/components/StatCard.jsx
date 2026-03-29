import { motion } from "framer-motion";

export default function StatCard({ title, value, subtitle, icon: Icon, colorClass, delay = 0 }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      className="glass-card p-4"
    >
      <div className="mb-2 flex items-center justify-between">
        <p className="text-xs uppercase tracking-wider text-slate-300">{title}</p>
        <Icon size={18} className={colorClass} />
      </div>
      <p className="text-2xl font-semibold text-white">{value}</p>
      {subtitle ? <p className="mt-1 text-xs text-slate-300">{subtitle}</p> : null}
    </motion.div>
  );
}
