import { motion } from "framer-motion";
import { BrainCircuit, Lock, UserCircle2 } from "lucide-react";

export default function LoginPage({ form, setForm, onLogin, loggingIn, error }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-app-gradient px-4 py-10">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-card w-full max-w-md p-8"
      >
        <div className="mb-6 flex items-center gap-3">
          <div className="rounded-xl bg-neon-purple/30 p-3 shadow-neon">
            <BrainCircuit className="text-neon-cyan" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-white">AI Smart Parking</h1>
            <p className="text-sm text-slate-300">Secure dashboard login</p>
          </div>
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            onLogin();
          }}
          className="space-y-4"
        >
          <label className="block text-sm text-slate-200">
            Username
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2">
              <UserCircle2 size={18} className="text-neon-cyan" />
              <input
                value={form.username}
                onChange={(e) => setForm((v) => ({ ...v, username: e.target.value }))}
                className="w-full bg-transparent text-sm text-white outline-none"
                placeholder="admin"
              />
            </div>
          </label>

          <label className="block text-sm text-slate-200">
            Password
            <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/20 bg-slate-900/60 px-3 py-2">
              <Lock size={16} className="text-neon-cyan" />
              <input
                type="password"
                value={form.password}
                onChange={(e) => setForm((v) => ({ ...v, password: e.target.value }))}
                className="w-full bg-transparent text-sm text-white outline-none"
                placeholder="admin123"
              />
            </div>
          </label>

          {error ? <p className="text-sm text-rose-300">{error}</p> : null}

          <button type="submit" className="neon-button w-full" disabled={loggingIn}>
            {loggingIn ? "Authenticating..." : "Enter Dashboard"}
          </button>
        </form>

        <p className="mt-4 text-xs text-slate-400">Demo credentials: admin / admin123</p>
      </motion.div>
    </div>
  );
}
