import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Activity, Car, Map, Sparkles } from "lucide-react";

import {
  checkInVehicle,
  createVehicle,
  findSlot,
  getParkingData,
  listVehicles,
  login,
  simulateParkingUpdate,
} from "./api/client";
import ControlPanel from "./components/ControlPanel";
import LoginPage from "./components/LoginPage";
import ParkingGrid from "./components/ParkingGrid";
import RoutePanel from "./components/RoutePanel";
import StatCard from "./components/StatCard";
import VehiclePanel from "./components/VehiclePanel";

export default function App() {
  const [token, setToken] = useState(localStorage.getItem("smart-parking-token") || "");
  const [loginForm, setLoginForm] = useState({ username: "admin", password: "admin123" });
  const [loginError, setLoginError] = useState("");
  const [loggingIn, setLoggingIn] = useState(false);

  const [parkingData, setParkingData] = useState(null);
  const [selectedNode, setSelectedNode] = useState("");
  const [route, setRoute] = useState(null);
  const [algorithm, setAlgorithm] = useState("astar");
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [vehicles, setVehicles] = useState([]);
  const [loadingVehicles, setLoadingVehicles] = useState(false);

  const occupancy = useMemo(() => {
    if (!parkingData?.total_slots) return 0;
    return Math.round((parkingData.occupied_slots / parkingData.total_slots) * 100);
  }, [parkingData]);

  const selectedSlot = useMemo(() => {
    if (!parkingData?.slots?.length || !selectedNode) return null;
    return parkingData.slots.find((s) => s.node_id === selectedNode) || null;
  }, [parkingData, selectedNode]);

  async function loadParking() {
    const data = await getParkingData();
    setParkingData(data);
    if (!selectedNode && data.slots.length) {
      setSelectedNode(data.slots[0].node_id);
    }
  }

  async function loadVehicles() {
    setLoadingVehicles(true);
    try {
      const data = await listVehicles();
      setVehicles(Array.isArray(data) ? data : data.value || []);
    } finally {
      setLoadingVehicles(false);
    }
  }

  async function handleCreateVehicle(payload) {
    try {
      await createVehicle(payload);
    } catch (error) {
      // Allow reusing existing vehicle records for direct parking assignment.
      if (!String(error.message || "").toLowerCase().includes("already exists")) {
        throw error;
      }
    }

    const checkIn = await checkInVehicle({
      vehicle_number: payload.vehicle_number,
      current_node: selectedNode || "N0000",
      algorithm,
    });

    await loadVehicles();
    await loadParking();

    if (checkIn?.path?.length) {
      const distance = Math.max(checkIn.path.length - 1, 0);
      setRoute({
        algorithm: checkIn.algorithm,
        target_node: checkIn.assigned_slot,
        target_label: checkIn.assigned_label,
        path: checkIn.path,
        distance,
        estimated_minutes: Number((distance * 0.55).toFixed(2)),
      });
    }

    return checkIn;
  }

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    let mounted = true;
    setLoading(true);

    loadParking()
      .catch(() => {})
      .finally(() => {
        if (mounted) setLoading(false);
      });

    loadVehicles().catch(() => {});

    const id = setInterval(async () => {
      try {
        await simulateParkingUpdate();
        await loadParking();
      } catch {
        // Keep UI responsive even if one update fails.
      }
    }, 9000);

    return () => {
      mounted = false;
      clearInterval(id);
    };
  }, [token]);

  async function handleLogin() {
    setLoggingIn(true);
    setLoginError("");
    try {
      const auth = await login(loginForm.username, loginForm.password);
      localStorage.setItem("smart-parking-token", auth.token);
      setToken(auth.token);
    } catch (error) {
      setLoginError(error.message);
    } finally {
      setLoggingIn(false);
    }
  }

  async function handleFindSlot() {
    if (!selectedNode) return;
    setBusy(true);
    try {
      const result = await findSlot(selectedNode, algorithm);
      setRoute(result);
      await loadParking();
    } catch (error) {
      setRoute(null);
      alert(error.message);
    } finally {
      setBusy(false);
    }
  }

  async function handleSimulate() {
    setBusy(true);
    try {
      await simulateParkingUpdate();
      await loadParking();
    } catch (error) {
      alert(error.message);
    } finally {
      setBusy(false);
    }
  }

  function handleLogout() {
    localStorage.removeItem("smart-parking-token");
    setToken("");
    setRoute(null);
  }

  if (!token) {
    return (
      <LoginPage
        form={loginForm}
        setForm={setLoginForm}
        onLogin={handleLogin}
        loggingIn={loggingIn}
        error={loginError}
      />
    );
  }

  return (
    <div className="min-h-screen bg-app-gradient px-4 py-6 text-slate-100 sm:px-6 lg:px-10">
      <div className="mx-auto max-w-7xl">
        <motion.header
          initial={{ opacity: 0, y: -14 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card mb-6 flex flex-col items-start justify-between gap-4 p-5 md:flex-row md:items-center"
        >
          <div>
            <h1 className="text-2xl font-extrabold tracking-tight text-white sm:text-3xl">AI Smart Parking Finder</h1>
            <p className="mt-1 text-sm text-slate-300">Neon dashboard with real-time smart parking intelligence</p>
          </div>
          <div className="flex items-center gap-2">
            <button className="neon-button" onClick={handleLogout}>Logout</button>
          </div>
        </motion.header>

        <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <StatCard title="Available Slots" value={parkingData?.available_slots ?? "--"} subtitle="Live capacity" icon={Car} colorClass="text-emerald-300" delay={0.05} />
          <StatCard title="Occupied Slots" value={parkingData?.occupied_slots ?? "--"} subtitle="Currently taken" icon={Map} colorClass="text-rose-300" delay={0.12} />
          <StatCard title="Occupancy" value={`${occupancy}%`} subtitle="Utilization rate" icon={Activity} colorClass="text-neon-cyan" delay={0.2} />
          <StatCard
            title="ETA"
            value={route ? `${route.estimated_minutes} min` : "--"}
            subtitle="Estimated drive time"
            icon={Sparkles}
            colorClass="text-neon-purple"
            delay={0.28}
          />
        </div>

        <AnimatePresence mode="wait">
          {loading ? (
            <motion.div
              key="loading"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="glass-card p-10 text-center text-slate-200"
            >
              Loading live parking intelligence...
            </motion.div>
          ) : (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="grid gap-4 xl:grid-cols-[1.35fr_1fr_0.95fr]">
              <ParkingGrid
                slots={parkingData?.slots || []}
                rows={parkingData?.rows || 0}
                cols={parkingData?.cols || 0}
                selectedNode={selectedNode}
                onSelectNode={setSelectedNode}
                routePath={route?.path || []}
                targetNode={route?.target_node || ""}
              />

              <div className="space-y-4">
                <ControlPanel
                  algorithm={algorithm}
                  setAlgorithm={setAlgorithm}
                  onFind={handleFindSlot}
                  onSimulate={handleSimulate}
                  busy={busy}
                  hasSelection={Boolean(selectedNode)}
                  selectedNode={selectedNode}
                  selectedStatus={selectedSlot?.status || "unknown"}
                  slots={parkingData?.slots || []}
                  rows={parkingData?.rows || 0}
                  cols={parkingData?.cols || 0}
                  routePath={route?.path || []}
                  targetNode={route?.target_node || ""}
                />
                <RoutePanel route={route} />
              </div>

              <VehiclePanel
                vehicles={vehicles}
                onCreateVehicle={handleCreateVehicle}
                loadingVehicles={loadingVehicles}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
