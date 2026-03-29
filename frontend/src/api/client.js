const API_BASE = import.meta.env.PROD ? "/api" : "http://localhost:8000";

async function parseResponse(response) {
  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.detail || "Request failed");
  }
  return data;
}

export async function login(username, password) {
  const response = await fetch(`${API_BASE}/api/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username, password }),
  });
  return parseResponse(response);
}

export async function getParkingData() {
  const response = await fetch(`${API_BASE}/api/parking`);
  return parseResponse(response);
}

export async function findSlot(currentNode, algorithm) {
  const response = await fetch(`${API_BASE}/api/find-slot`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ current_node: currentNode, algorithm }),
  });
  return parseResponse(response);
}

export async function simulateParkingUpdate() {
  const response = await fetch(`${API_BASE}/api/parking/simulate`, {
    method: "POST",
  });
  return parseResponse(response);
}

export async function listVehicles() {
  const response = await fetch(`${API_BASE}/api/vehicles`);
  return parseResponse(response);
}

export async function createVehicle(payload) {
  const response = await fetch(`${API_BASE}/api/vehicles`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}

export async function checkInVehicle(payload) {
  const response = await fetch(`${API_BASE}/api/check-in`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return parseResponse(response);
}
