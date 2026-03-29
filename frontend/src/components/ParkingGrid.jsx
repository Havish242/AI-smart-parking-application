import { motion } from "framer-motion";
import bikeRealistic from "../assets/bike-realistic.svg";
import carRealistic from "../assets/car-realistic.svg";

function isInPath(path, nodeId) {
  return path.includes(nodeId);
}

function iconForOccupiedSlot(slot) {
  const vehicleType = (slot.vehicle_type || "").toLowerCase();
  if (vehicleType === "bike") {
    return "bike";
  }

  const nodeId = slot.node_id;
  const numeric = Number.parseInt(nodeId.replace(/\D/g, ""), 10);
  if (Number.isNaN(numeric)) {
    return "car";
  }
  return numeric % 2 === 0 ? "car" : "bike";
}

function parseNode(nodeId) {
  const match = /^N(\d{2})(\d{2})$/.exec(nodeId || "");
  if (!match) return null;
  return { row: Number(match[1]), col: Number(match[2]) };
}

function directionArrow(currentNode, nextNode) {
  const a = parseNode(currentNode);
  const b = parseNode(nextNode);
  if (!a || !b) return "";
  if (b.row === a.row && b.col === a.col + 1) return "->";
  if (b.row === a.row && b.col === a.col - 1) return "<-";
  if (b.row === a.row + 1 && b.col === a.col) return "v";
  if (b.row === a.row - 1 && b.col === a.col) return "^";
  return "";
}

export default function ParkingGrid({ slots, rows, cols, selectedNode, onSelectNode, routePath, targetNode }) {
  return (
    <div className="glass-card p-4">
      <div className="mb-3 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-white">Parking Map</h3>
        <p className="text-xs text-slate-300">Red: occupied | Green: available</p>
      </div>

      <div
        className="grid gap-2"
        style={{
          gridTemplateColumns: `repeat(${cols || 1}, minmax(0, 1fr))`,
        }}
      >
        {slots.map((slot, idx) => {
          const active = selectedNode === slot.node_id;
          const isTarget = targetNode === slot.node_id;
          const inRoute = isInPath(routePath, slot.node_id);
          const pathOrder = routePath.indexOf(slot.node_id);
          const nextNode = pathOrder >= 0 ? routePath[pathOrder + 1] : null;
          const arrow = nextNode ? directionArrow(slot.node_id, nextNode) : "";
          const isStart = pathOrder === 0;
          const baseClass =
            slot.status === "available"
              ? "bg-emerald-500/80 hover:bg-emerald-400"
              : "bg-rose-500/80 hover:bg-rose-400";

          return (
            <motion.button
              key={slot.node_id}
              initial={{ opacity: 0, scale: 0.85 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.008 }}
              onClick={() => onSelectNode(slot.node_id)}
              className={`relative aspect-square rounded-lg border text-[11px] font-semibold text-white transition-all ${baseClass} ${
                active ? "border-cyan-200 shadow-neon" : "border-transparent"
              } ${inRoute ? "ring-2 ring-cyan-200" : ""} ${isTarget ? "ring-2 ring-emerald-200" : ""}`}
            >
              {slot.status === "occupied" && (
                <span className="absolute inset-0 flex items-center justify-center rounded-md bg-black/20">
                  {iconForOccupiedSlot(slot) === "car" ? (
                    <img
                      src={carRealistic}
                      alt="Car"
                      className="h-7 w-7 object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.35)]"
                    />
                  ) : (
                    <img
                      src={bikeRealistic}
                      alt="Bike"
                      className="h-7 w-7 object-contain drop-shadow-[0_0_6px_rgba(255,255,255,0.35)]"
                    />
                  )}
                </span>
              )}
              {inRoute && (
                <>
                  <span className="absolute -top-2 -right-2 rounded-full bg-cyan-300 px-1 text-[9px] font-bold text-slate-900">
                    {pathOrder + 1}
                  </span>
                  {arrow ? (
                    <span className="absolute left-1 top-1 rounded bg-black/35 px-1 text-[10px] font-bold text-cyan-100">
                      {arrow}
                    </span>
                  ) : null}
                </>
              )}
              {isStart && (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 rounded-full bg-cyan-200 px-1.5 py-[1px] text-[9px] font-bold text-cyan-900">
                  START
                </span>
              )}
              {isTarget && (
                <span className="absolute -bottom-2 left-1/2 -translate-x-1/2 animate-pulse rounded-full bg-emerald-300 px-1.5 py-[1px] text-[9px] font-bold text-emerald-900">
                  FREE
                </span>
              )}
            </motion.button>
          );
        })}
      </div>

      <p className="mt-3 text-xs text-slate-300">
        Selected location: <span className="font-semibold text-cyan-200">{selectedNode || "None"}</span>
      </p>
      <p className="mt-1 text-[11px] text-slate-400">
        Route guide: numbered cyan dots show sequence, arrows show movement direction.
      </p>
    </div>
  );
}
