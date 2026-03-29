import { useEffect, useMemo, useState } from "react";
import { Bot, ChevronLeft, ChevronRight, Compass, LoaderCircle, Pause, Play, RefreshCw } from "lucide-react";

function parseNode(nodeId) {
  const match = /^N(\d{2})(\d{2})$/.exec(nodeId || "");
  if (!match) return null;
  return { row: Number(match[1]), col: Number(match[2]) };
}

function makeNode(row, col) {
  return `N${String(row).padStart(2, "0")}${String(col).padStart(2, "0")}`;
}

function buildPreviewPath(startNode, freeNode) {
  const start = parseNode(startNode);
  const free = parseNode(freeNode);
  if (!start || !free) return [];

  const path = [startNode];
  let r = start.row;
  let c = start.col;

  while (r !== free.row) {
    r += free.row > r ? 1 : -1;
    path.push(makeNode(r, c));
  }
  while (c !== free.col) {
    c += free.col > c ? 1 : -1;
    path.push(makeNode(r, c));
  }

  return path;
}

function getNeighbors(nodeId, rows, cols) {
  const node = parseNode(nodeId);
  if (!node) return [];
  const out = [];
  const dirs = [
    [1, 0],
    [-1, 0],
    [0, 1],
    [0, -1],
  ];
  for (const [dr, dc] of dirs) {
    const nr = node.row + dr;
    const nc = node.col + dc;
    if (nr >= 0 && nr < rows && nc >= 0 && nc < cols) {
      out.push(makeNode(nr, nc));
    }
  }
  return out;
}

function findPathBfs(startNode, goalNode, rows, cols, blockedSet) {
  if (!startNode || !goalNode) return [];
  const queue = [startNode];
  const parent = new Map();
  const seen = new Set([startNode]);

  while (queue.length > 0) {
    const current = queue.shift();
    if (current === goalNode) break;

    const neighbors = getNeighbors(current, rows, cols);
    for (const next of neighbors) {
      if (seen.has(next)) continue;
      if (blockedSet.has(next) && next !== goalNode) continue;
      seen.add(next);
      parent.set(next, current);
      queue.push(next);
    }
  }

  if (!seen.has(goalNode)) return [];
  const path = [goalNode];
  let cursor = goalNode;
  while (cursor !== startNode) {
    cursor = parent.get(cursor);
    if (!cursor) return [];
    path.push(cursor);
  }
  path.reverse();
  return path;
}

function nearestFreeNode(selectedNode, slots) {
  const start = parseNode(selectedNode);
  if (!start) return "";

  let best = "";
  let bestDist = Number.POSITIVE_INFINITY;

  for (const slot of slots) {
    if (slot.status !== "available") continue;
    const dist = Math.abs(slot.row - start.row) + Math.abs(slot.col - start.col);
    if (dist < bestDist) {
      bestDist = dist;
      best = slot.node_id;
    }
  }

  return best;
}

function computeLogicalRoute(selectedNode, slots, rows, cols) {
  const targetFree = nearestFreeNode(selectedNode, slots);
  if (!selectedNode || !targetFree) {
    return { route: [], targetFree: "", blockedNode: "" };
  }

  const blockedSet = new Set(slots.filter((s) => s.status === "occupied").map((s) => s.node_id));
  blockedSet.delete(selectedNode);
  blockedSet.delete(targetFree);

  const direct = buildPreviewPath(selectedNode, targetFree);
  const blockedNode = direct.find((nodeId, idx) => idx > 0 && blockedSet.has(nodeId)) || "";

  const reroute = findPathBfs(selectedNode, targetFree, rows, cols, blockedSet);
  if (reroute.length > 0) {
    return { route: reroute, targetFree, blockedNode };
  }

  return { route: direct, targetFree, blockedNode };
}

function detectBlockedOnPath(path, slots, targetNode) {
  if (!path || path.length === 0) return "";
  const statusByNode = new Map(slots.map((s) => [s.node_id, s.status]));
  for (let i = 1; i < path.length; i += 1) {
    const node = path[i];
    if (node === targetNode) continue;
    if (statusByNode.get(node) === "occupied") {
      return node;
    }
  }
  return "";
}

function SampleRouteMap({ rows, cols, slots, selectedNode, routePath, targetNode, currentStep, blockedNode }) {
  const safeRows = rows || 8;
  const safeCols = cols || 8;

  const routeToDisplay = routePath.length > 0
    ? routePath
    : buildPreviewPath(selectedNode, nearestFreeNode(selectedNode, slots));

  const routeSet = new Set(routeToDisplay);
  const visitedSet = new Set(routeToDisplay.slice(0, Math.max(currentStep + 1, 1)));
  const startNode = routeToDisplay[0] || selectedNode;
  const freeNode = targetNode || routeToDisplay[routeToDisplay.length - 1] || "";
  const activeNode = routeToDisplay[currentStep] || "";

  const statusByNode = new Map(slots.map((s) => [s.node_id, s.status]));

  return (
    <div className="mt-2">
      <div
        className="grid gap-1"
        style={{ gridTemplateColumns: `repeat(${safeCols}, minmax(0, 1fr))` }}
      >
        {Array.from({ length: safeRows * safeCols }).map((_, index) => {
          const r = Math.floor(index / safeCols);
          const c = index % safeCols;
          const key = makeNode(r, c);
          const inRoute = routeSet.has(key);
          const isStart = key === startNode;
          const isFree = key === freeNode;
          const isActive = key === activeNode;
          const isBlocked = key === blockedNode;
          const status = statusByNode.get(key);

          let tone = "border-white/15 bg-slate-800/65";
          if (status === "occupied") tone = "border-rose-300/30 bg-rose-500/20";
          if (status === "available") tone = "border-emerald-300/30 bg-emerald-500/15";
          if (inRoute) tone = "border-cyan-200 bg-cyan-400/25";
          if (visitedSet.has(key) && inRoute) tone = "border-cyan-200 bg-cyan-400/35";
          if (isBlocked) tone = "border-rose-200 bg-rose-500/45";
          if (isActive) tone = "border-amber-200 bg-amber-400/45";

          return (
            <div
              key={key}
              className={`relative aspect-square rounded border ${tone}`}
            >
              {isStart && (
                <span className="absolute inset-x-0 bottom-0 text-center text-[8px] font-bold text-cyan-200">
                  START
                </span>
              )}
              {isFree && (
                <span className="absolute inset-x-0 bottom-0 text-center text-[8px] font-bold text-emerald-200">
                  FREE
                </span>
              )}
              {isActive && (
                <span className="absolute inset-x-0 top-0 text-center text-[8px] font-bold text-amber-100">
                  YOU
                </span>
              )}
              {isBlocked && (
                <span className="absolute inset-x-0 top-0 text-center text-[8px] font-bold text-rose-100">
                  BLOCK
                </span>
              )}
            </div>
          );
        })}
      </div>
      <p className="mt-1 text-[10px] text-slate-300">
        Mini navigator: yellow is current step, cyan is route, green is free slot, red is occupied.
      </p>
    </div>
  );
}

export default function ControlPanel({
  algorithm,
  setAlgorithm,
  onFind,
  onSimulate,
  busy,
  hasSelection,
  selectedNode,
  selectedStatus,
  slots,
  rows,
  cols,
  routePath,
  targetNode,
}) {
  const safeRows = rows || 8;
  const safeCols = cols || 8;

  const logicalRoute = useMemo(
    () => computeLogicalRoute(selectedNode, slots, safeRows, safeCols),
    [selectedNode, slots, safeRows, safeCols]
  );

  const routeToDisplay = useMemo(() => {
    // Keep route visualization box logical: show reroute away from occupied nodes.
    if (routePath.length > 0) {
      return routePath;
    }
    return logicalRoute.route;
  }, [routePath, logicalRoute]);

  const blockedNode = routePath.length > 0
    ? detectBlockedOnPath(routePath, slots, targetNode)
    : logicalRoute.blockedNode;
  const freeNodeForViz = targetNode || logicalRoute.targetFree;

  const [currentStep, setCurrentStep] = useState(0);
  const [autoPlay, setAutoPlay] = useState(false);

  useEffect(() => {
    setCurrentStep(0);
    setAutoPlay(false);
  }, [routeToDisplay.join("|")]);

  useEffect(() => {
    if (!autoPlay || routeToDisplay.length < 2) return;
    const timer = setInterval(() => {
      setCurrentStep((prev) => {
        if (prev >= routeToDisplay.length - 1) {
          return prev;
        }
        return prev + 1;
      });
    }, 900);
    return () => clearInterval(timer);
  }, [autoPlay, routeToDisplay.length]);

  const maxStep = Math.max(routeToDisplay.length - 1, 0);
  const fromNode = routeToDisplay[currentStep] || "--";
  const toNode = routeToDisplay[Math.min(currentStep + 1, maxStep)] || "--";

  return (
    <div className="glass-card p-4">
      <h3 className="mb-4 text-lg font-semibold text-white">AI Smart Finder</h3>

      <label className="text-sm text-slate-200">Algorithm</label>
      <select
        value={algorithm}
        onChange={(e) => setAlgorithm(e.target.value)}
        className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none"
      >
        <option value="astar">A* Algorithm (Primary)</option>
        <option value="best_first">Best First Search</option>
      </select>

      <div className="mt-4 grid gap-2 sm:grid-cols-2">
        <button onClick={onFind} className="neon-button flex items-center justify-center gap-2" disabled={!hasSelection || busy}>
          {busy ? <LoaderCircle size={16} className="animate-spin" /> : <Bot size={16} />}
          Find Free Slot
        </button>
        <button onClick={onSimulate} className="neon-button flex items-center justify-center gap-2" disabled={busy}>
          <RefreshCw size={16} />
          Simulate Live
        </button>
      </div>

      <div className="mt-3 rounded-xl border border-white/20 bg-slate-900/50 p-3 text-xs text-slate-200">
        <p>
          Start node: <span className="font-semibold text-cyan-200">{selectedNode || "None"}</span>
        </p>
        <p className="mt-1">
          Node status: <span className="font-semibold uppercase">{selectedStatus}</span>
        </p>
      </div>

      <div className="mt-4 rounded-xl border border-cyan-400/30 bg-cyan-500/10 p-3 text-xs text-cyan-100">
        <p className="flex items-center gap-2 font-semibold">
          <Compass size={14} /> Route Visualization
        </p>
        <p className="mt-1 text-slate-200">Run AI search to get nearest free slot, directional arrows on map, and turn-by-turn guidance.</p>
        {blockedNode ? (
          <p className="mt-1 text-[10px] text-rose-200">
            Occupied node detected at {blockedNode}. Visualization reroutes around blockage.
          </p>
        ) : (
          <p className="mt-1 text-[10px] text-emerald-200">No blockage on direct path. Route proceeds to free slot.</p>
        )}
        <div className="mt-2 rounded-lg border border-white/20 bg-slate-900/45 p-2 text-[11px] text-slate-100">
          <div className="flex items-center justify-between">
            <span>
              Step <span className="font-semibold text-cyan-200">{currentStep + 1}</span> / {maxStep + 1}
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setCurrentStep((s) => Math.max(0, s - 1))}
                className="rounded border border-white/20 bg-white/10 p-1 text-slate-100"
                disabled={currentStep === 0}
              >
                <ChevronLeft size={12} />
              </button>
              <button
                onClick={() => setAutoPlay((v) => !v)}
                className="rounded border border-white/20 bg-white/10 p-1 text-slate-100"
                disabled={routeToDisplay.length < 2}
              >
                {autoPlay ? <Pause size={12} /> : <Play size={12} />}
              </button>
              <button
                onClick={() => setCurrentStep((s) => Math.min(maxStep, s + 1))}
                className="rounded border border-white/20 bg-white/10 p-1 text-slate-100"
                disabled={currentStep >= maxStep}
              >
                <ChevronRight size={12} />
              </button>
            </div>
          </div>
          <p className="mt-1 text-[10px] text-slate-300">Current move: {fromNode} to {toNode}</p>
        </div>
        <SampleRouteMap
          rows={rows}
          cols={cols}
          slots={slots}
          selectedNode={selectedNode}
          routePath={routeToDisplay}
          targetNode={freeNodeForViz}
          currentStep={currentStep}
          blockedNode={blockedNode}
        />
      </div>
    </div>
  );
}
