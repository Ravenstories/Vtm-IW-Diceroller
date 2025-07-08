// File: js/unitPiece.js
import { hexes } from './map.js'; // we'll expose this in step 2

const unitPieces = [];
const unitSprites = {};

export function addUnitPiece({ id, label, color = "red", type }) {
  const hex = hexes.find(h => h.label === label);
  if (!hex) return;

  unitPieces.push({
    id,
    label,
    type,              // ✅ this must exist
    color,
    x: hex.x,
    y: hex.y
  });
}


export function drawUnitPieces(ctx, zoom) {
  for (const piece of unitPieces) {
    if (piece.sprite && unitSprites[piece.sprite]) {
      ctx.drawImage(unitSprites[piece.sprite], piece.x - 20, piece.y - 20, 40, 40);
    } else {
      // fallback: colored circle
      if (piece.type && unitSprites[piece.type]) {
        const img = unitSprites[piece.type];
        const size = 60;
        ctx.drawImage(img, piece.x - size / 2, piece.y - size / 2, size, size);
      } else {
        // fallback circle if no sprite
        ctx.beginPath();
        ctx.arc(piece.x, piece.y, 18 * zoom, 0, Math.PI * 2);
        ctx.fillStyle = piece.color || "red";
        ctx.fill();
        ctx.strokeStyle = "white";
        ctx.stroke();
      }
    }
  }
}

export function moveUnitTo(pieceId, newLabel) {
  const hex = hexes.find(h => h.label === newLabel);
  const piece = unitPieces.find(p => p.id === pieceId);
  if (hex && piece) {
    piece.label = newLabel;
    piece.x = hex.x;
    piece.y = hex.y;
  }
}

export function getPieceAt(x, y, radius = 20) {
  return unitPieces.find(p =>
    Math.hypot(p.x - x, p.y - y) < radius
  );
}

export function loadUnitSpritesFromUnitData(unitList) {
  for (const unit of unitList) {
    if (!unit.sprite) continue;
    const img = new Image();
    img.src = `./assets/sprites/${unit.sprite}`;
    unitSprites[unit.id] = img;
  }
}

export function removeUnit(id) {
  const i = unitPieces.findIndex(p => p.id === id);
  if (i !== -1) unitPieces.splice(i, 1);
}

export function exportMapState() {
  return JSON.stringify(unitPieces.map(p => ({
    id: p.id,
    type: p.sprite || p.type,
    label: p.label
  })));
}

export function importMapState(json) {
  unitPieces.length = 0;
  const data = JSON.parse(json);
  for (const u of data) {
    addUnitPiece({ id: u.id, label: u.label, type: u.type });
  }
}

export function downloadMapState(filename = "unitMapData.json") {
  const data = JSON.stringify(unitPieces.map(p => ({
    id: p.id,
    type: p.sprite,
    label: p.label
  })), null, 2);

  const blob = new Blob([data], { type: "application/json" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = filename;
  a.click();
}

export function loadMapStateFromFile(file, callback) {
  const reader = new FileReader();
  reader.onload = () => {
    const json = reader.result;
    unitPieces.length = 0;
    const data = JSON.parse(json);
    for (const u of data) {
      addUnitPiece({ id: u.id, label: u.label, sprite: u.type });
    }
    if (callback) callback();
  };
  reader.readAsText(file);
}
