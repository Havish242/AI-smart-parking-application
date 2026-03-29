import { useState } from "react";
import { CarFront, CirclePlus, Database, LoaderCircle } from "lucide-react";

export default function VehiclePanel({ vehicles, onCreateVehicle, loadingVehicles }) {
  const [form, setForm] = useState({
    vehicle_number: "",
    owner_name: "",
    vehicle_type: "standard",
  });
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const result = await onCreateVehicle({
        vehicle_number: form.vehicle_number.trim().toUpperCase(),
        owner_name: form.owner_name.trim(),
        vehicle_type: form.vehicle_type,
      });
      setForm({ vehicle_number: "", owner_name: "", vehicle_type: "standard" });
      setMessage(
        `Vehicle saved and parked at ${result.assigned_label} (${result.assigned_slot}). Map updated automatically.`
      );
    } catch (error) {
      setMessage(error.message || "Failed to save vehicle");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="glass-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
          <CirclePlus size={18} className="text-neon-cyan" /> Vehicle Details
        </h3>

        <form onSubmit={handleSubmit} className="space-y-3">
          <label className="block text-xs text-slate-200">
            Vehicle Number
            <input
              value={form.vehicle_number}
              onChange={(e) => setForm((v) => ({ ...v, vehicle_number: e.target.value }))}
              required
              placeholder="KA01AB1234"
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none"
            />
          </label>

          <label className="block text-xs text-slate-200">
            Owner Name
            <input
              value={form.owner_name}
              onChange={(e) => setForm((v) => ({ ...v, owner_name: e.target.value }))}
              required
              placeholder="Owner Name"
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none"
            />
          </label>

          <label className="block text-xs text-slate-200">
            Vehicle Type
            <select
              value={form.vehicle_type}
              onChange={(e) => setForm((v) => ({ ...v, vehicle_type: e.target.value }))}
              className="mt-1 w-full rounded-xl border border-white/20 bg-slate-900/70 px-3 py-2 text-sm text-white outline-none"
            >
              <option value="standard">Standard</option>
              <option value="compact">Compact</option>
              <option value="large">Large / SUV</option>
              <option value="ev">EV</option>
              <option value="bike">Bike</option>
            </select>
          </label>

          <button type="submit" className="neon-button w-full" disabled={saving}>
            {saving ? (
              <span className="inline-flex items-center gap-2"><LoaderCircle size={14} className="animate-spin" /> Saving...</span>
            ) : (
              "Save Vehicle to DB"
            )}
          </button>
        </form>

        {message ? <p className="mt-2 text-xs text-cyan-100">{message}</p> : null}
      </div>

      <div className="glass-card p-4">
        <h3 className="mb-3 flex items-center gap-2 text-lg font-semibold text-white">
          <Database size={18} className="text-neon-cyan" /> Registered Vehicles
        </h3>
        {loadingVehicles ? (
          <p className="text-sm text-slate-300">Loading vehicles...</p>
        ) : (
          <div className="max-h-64 space-y-2 overflow-auto pr-1">
            {vehicles.length === 0 ? (
              <p className="text-sm text-slate-300">No vehicles in database yet.</p>
            ) : (
              vehicles.slice(0, 12).map((v) => (
                <div key={`${v.vehicle_number}-${v.created_at}`} className="rounded-xl border border-white/15 bg-slate-900/45 p-2.5">
                  <p className="flex items-center gap-1 text-sm font-semibold text-cyan-100"><CarFront size={14} /> {v.vehicle_number}</p>
                  <p className="text-xs text-slate-300">{v.owner_name}</p>
                  <p className="text-[11px] uppercase text-slate-400">{v.vehicle_type}</p>
                </div>
              ))
            )}
          </div>
        )}
      </div>
    </div>
  );
}
