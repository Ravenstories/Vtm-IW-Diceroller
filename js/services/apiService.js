const API_URL = "https://vtm-iw-diceroller-apiserver.onrender.com"; // Replace with your actual Render URL

export async function saveGameState(name, json, password) {
  const res = await fetch(`${API_URL}/save`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, data: json, password })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Save failed: ${error.error?.message || res.status}`);
  }
}

export async function loadGameState(name, password) {
  const res = await fetch(`${API_URL}/load`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, password })
  });

  if (!res.ok) {
    const error = await res.json();
    throw new Error(`Load failed: ${error.error?.message || res.status}`);
  }

  const { data } = await res.json();
  return data;
}
