import { Car, MapPinned, Navigation } from "lucide-react";

function parseNode(nodeId) {
  const match = /^N(\d{2})(\d{2})$/.exec(nodeId || "");
  if (!match) return null;
  return { row: Number(match[1]), col: Number(match[2]) };
}

function directionText(fromNode, toNode) {
  const a = parseNode(fromNode);
  const b = parseNode(toNode);
  if (!a || !b) return "Move ahead";
  if (b.row === a.row && b.col === a.col + 1) return "Move right";
  if (b.row === a.row && b.col === a.col - 1) return "Move left";
  if (b.row === a.row + 1 && b.col === a.col) return "Move down";
  if (b.row === a.row - 1 && b.col === a.col) return "Move up";
  return "Continue";
}

function buildSteps(path) {
  if (!path || path.length < 2) return [];
  const steps = [];
  for (let i = 0; i < path.length - 1; i += 1) {
    steps.push({
      from: path[i],
      to: path[i + 1],
      instruction: directionText(path[i], path[i + 1]),
    });
  }
  return steps;
}

export default function RoutePanel({ route }) {
  const steps = route ? buildSteps(route.path) : [];

  if (!route) {
    return (
      <div className="glass-card p-4">
        <h3 className="text-lg font-semibold text-white">Nearest Free Slot</h3>
        <p className="mt-2 text-sm text-slate-300">No route computed yet. Select your location and run Find Free Slot.</p>
      </div>
    );
  }

  return (
    <div className="glass-card p-4">
      <h3 className="mb-3 text-lg font-semibold text-white">Nearest Free Slot</h3>
      <div className="space-y-2 text-sm text-slate-200">
        <p className="flex items-center gap-2"><Car size={16} className="text-neon-cyan" /> Free slot: <span className="font-semibold">{route.target_label}</span></p>
        <p className="flex items-center gap-2"><MapPinned size={16} className="text-neon-cyan" /> Distance: <span className="font-semibold">{route.distance} steps</span></p>
        <p className="flex items-center gap-2"><Navigation size={16} className="text-neon-cyan" /> ETA: <span className="font-semibold">{route.estimated_minutes} min</span></p>
        <p>Algorithm: <span className="font-semibold uppercase">{route.algorithm}</span></p>
      </div>

      <div className="mt-3 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-2 text-xs text-cyan-100">
        <p className="font-semibold">Smart Guidance</p>
        <p className="mt-1 text-slate-200">
          {steps.length > 0
            ? `${steps.length} turn-by-turn instructions generated for this route.`
            : "You are already at the nearest free slot."}
        </p>
      </div>

      <div className="mt-3 rounded-xl border border-white/20 bg-slate-900/50 p-2 text-xs text-slate-200">
        <p className="mb-1 text-slate-300">Path sequence</p>
        <p className="leading-6">{route.path.join(" -> ")}</p>
      </div>

      {steps.length > 0 && (
        <div className="mt-3 rounded-xl border border-white/20 bg-slate-900/50 p-2 text-xs text-slate-200">
          <p className="mb-2 text-slate-300">Turn-by-turn</p>
          <div className="space-y-1.5">
            {steps.map((step, index) => (
              <div key={`${step.from}-${step.to}`} className="rounded-lg border border-white/10 bg-white/5 px-2 py-1.5">
                <p className="font-semibold text-cyan-200">Step {index + 1}: {step.instruction}</p>
                <p className="text-[11px] text-slate-300">{`${step.from} -> ${step.to}`}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
