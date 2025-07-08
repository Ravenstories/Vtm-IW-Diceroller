import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";
import { APIKEY, APIURL  } from "../config/supabase.config.js";

if (!APIURL || !APIKEY) {
  console.warn("🚨 Supabase credentials are missing. Did you forget to create supabase.config.js?");
}

const supabase = createClient(APIURL, APIKEY);

export async function saveGameState(name, mapDataJson) {
  const { data, error } = await supabase
    .from("game_states")
    .upsert([{ name, data: mapDataJson }], { onConflict: ["name"] });

  if (error) {
    console.error("❌ Save failed:", error);
    throw error;
  }

  console.log("✅ Game state saved:", data);
  return data;
}

export async function loadGameState(name) {
  const { data, error } = await supabase
    .from("game_states")
    .select()
    .eq("name", name)
    .single();

  if (error) {
    console.error("❌ Load failed:", error);
    throw error;
  }

  console.log("✅ Game state loaded:", data);
  return data.data; // <- this is the JSON blob
}

export async function listSavedGames() {
  const { data, error } = await supabase
    .from("game_states")
    .select("name, created_at")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("❌ Failed to list games:", error);
    throw error;
  }

  return data;
}
