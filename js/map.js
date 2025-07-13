/* =========  IMPORT UI HELPERS  ========= */
import * as unitPiece from './unitPiece.js';
import { initUI  } from './mapUI.js';
import * as unitData from './services/unitDataService.js';
import { saveGameState, loadGameState } from "./services/apiService.js";

const ui = initUI();
let selectedPiece = null; // currently selected unit piece

/* =========  UNIT DRAGGING  ========= */

let draggedPiece = null;
let draggedOffset = { x: 0, y: 0 };

/* =========  MAP + GRID CONSTANTS  ========= */
const MAP_SRC = "./assets/img/InquisitionWars-Map.jpg";

let hoverHex   = null;      // hex currently under cursor
let labelAlpha = 0;         // 0 → 1 fade for text
let dragMoved = false;      // true if dragging moved the canvas

/* grid & tuned numbers (keep your latest) */
const COLS      = 27;
const ROW_LABELS= 'ABCDEFGHIJKLMNOPQ'.split('').reverse().map(c=>`${c}0`);
const HEX_W = 95.9, HEX_R = HEX_W/1.88;
const HEX_H = Math.sqrt(3)*HEX_R, DX = HEX_W*0.8, DY = HEX_H;
const ORIGIN_X = 28, ORIGIN_Y = 90;

/* ============  CANVAS  ============ */
const cvs = document.getElementById("mapCanvas");
const ctx = cvs.getContext("2d");
cvs.width = innerWidth; cvs.height = innerHeight;

const img = new Image();
img.src   = MAP_SRC;

const contextMenu = document.getElementById("contextMenu");

/* ============  STATE  ============ */
let zoom=1, offX=0, offY=0, drag=false, start={x:0,y:0}, sel=null;
const hexes=[];

/* ---------- geometry ---------- */
const Y = ROW_LABELS;
function hexPos(col,row){
  const x = ORIGIN_X + col*DX;
  const y = ORIGIN_Y + row*DY - (col&1 ? DY/2 : 0);
  return {x,y};
}
function build(){
  hexes.length=0;
  for(let col=0;col<COLS;col++)
    for(let row=0;row<Y.length;row++){
      const label = `${Y[row]}${col}`;
      hexes.push({...hexPos(col,row),label});
    }
}

/* ---------- draw ---------- */
function drawHex(hex, shouldFill = false, showLabel = false, alpha = 1) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = Math.PI / 180 * (60 * i);
    const px = hex.x + HEX_R * Math.cos(angle);
    const py = hex.y + HEX_R * Math.sin(angle);
    i ? ctx.lineTo(px, py) : ctx.moveTo(px, py);
  }
  ctx.closePath();

  if (shouldFill) {
    ctx.fillStyle = "rgba(180, 0, 0, 0.35)";
    ctx.fill();
  }

  ctx.strokeStyle = "rgba(255, 255, 255, 0.15)";
  ctx.stroke();

  if (showLabel) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = "#fff";
    ctx.font = "11px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText(hex.label, hex.x, hex.y);
    ctx.restore();
  }
}
function render() {
  ctx.setTransform(1, 0, 0, 1, 0, 0);
  ctx.clearRect(0, 0, cvs.width, cvs.height);

  ctx.save();
  ctx.translate(offX, offY);
  ctx.scale(zoom, zoom);
  ctx.drawImage(img, 0, 0);

  hexes.forEach(hex => {
    const isHover = hex === hoverHex;
    drawHex(hex, isHover, isHover, labelAlpha);
  });

  unitPiece.drawUnitPieces(ctx, zoom);
  ctx.restore();
}
/* ---------- util ---------- */
function pick(evt){
  const r=cvs.getBoundingClientRect();
  const gx=(evt.clientX-r.left-offX)/zoom,
        gy=(evt.clientY-r.top -offY)/zoom;
  return hexes.find(h=>Math.hypot(gx-h.x,gy-h.y)<HEX_R*0.9);
}
function tick(){
  // fade toward 1 if hovering, toward 0 otherwise
  const target = hoverHex ? 1 : 0;
  labelAlpha  += (target - labelAlpha) * 0.15;   // easing
  render();
  requestAnimationFrame(tick);
}
function showUnitSelector(onConfirm) {
  const modal = document.getElementById("unitSelectorModal");
  const select = document.getElementById("unitSelect");
  const button = document.getElementById("confirmUnit");

  const unitList = unitData.getUnitTypes();
  select.innerHTML = "";
  unitList.forEach(id => {
    const unit = unitData.getUnitById(id);
    const option = document.createElement("option");
    option.value = id;
    option.textContent = unit.name;
    select.appendChild(option);
  });

  button.onclick = () => {
    modal.style.display = "none";
    onConfirm(select.value);
  };

  modal.style.display = "flex";
}
function showUnitModal(piece) {
  const unit = unitData.getUnitById(piece?.type);
  if (unit) {
    const html = `
      <strong>${unit.name}</strong><br>
      <em>${unit.archon || ""}</em><br><br>
      <b>Power:</b> ${unit.power}<br>
      <b>Toughness:</b> ${unit.toughness}<br>
      <b>Obscurity:</b> ${unit.obscurity}<br>
      <b>Max HP:</b> ${unit.maxHealth}<br>
      <b>Traits:</b> ${unit.traits.join(", ")}<br>
      <b>Tags:</b> ${unit.tags.join(", ")}<br>
    `;
    ui.openModal(`Unit: ${unit.name}`, html);
  } else {
    ui.openModal("Unit Info", "(Unknown unit)");
  }
}
function getTouchDistance(touches) {
  const dx = touches[0].clientX - touches[1].clientX;
  const dy = touches[0].clientY - touches[1].clientY;
  return Math.hypot(dx, dy);
}

function getTouchMidpoint(touches) {
  return {
    x: (touches[0].clientX + touches[1].clientX) / 2,
    y: (touches[0].clientY + touches[1].clientY) / 2,
  };
}

/* ---------- events ---------- */
function bindCanvasEvents() {
  let longPressTimer = null;
let longPressPos = null;
let longPressTriggered = false;

cvs.addEventListener("touchstart", (e) => {
  if (e.touches.length !== 1) return;

  const t = e.touches[0];
  drag = true;
  dragMoved = false;
  start = { x: t.clientX, y: t.clientY };
  longPressPos = { x: t.clientX, y: t.clientY };
  longPressTriggered = false;

  longPressTimer = setTimeout(() => {
    longPressTriggered = true;
    showContextMenuAt(longPressPos.x, longPressPos.y);
    longPressTimer = null;
  }, 600);
});

cvs.addEventListener("touchmove", (e) => {
  if (!drag) return;

  const t = e.touches[0];
  const dx = t.clientX - start.x;
  const dy = t.clientY - start.y;

  if (Math.abs(dx) > 3 || Math.abs(dy) > 3) {
    dragMoved = true;
    clearTimeout(longPressTimer);
    longPressTimer = null;
  }

  offX += dx;
  offY += dy;
  start = { x: t.clientX, y: t.clientY };
  render();
});

cvs.addEventListener("touchend", (e) => {
  drag = false;
  clearTimeout(longPressTimer);
  longPressTimer = null;

  if (longPressTriggered) return; // already handled

  const r = cvs.getBoundingClientRect();
  const t = e.changedTouches[0];
  const gx = (t.clientX - r.left - offX) / zoom;
  const gy = (t.clientY - r.top - offY) / zoom;

  const piece = unitPiece.getPieceAt(gx, gy);
  const hex   = pick({ clientX: t.clientX, clientY: t.clientY });

  if (piece) {
    // Step 1: select a unit
    selectedUnitForMove = piece;
    ui.showTip(`Selected ${piece.type}`, t.clientX, t.clientY);
    setTimeout(() => ui.hideTip(), 1000);
    return;
  }

  if (selectedUnitForMove && hex) {
    // Step 2: move selected unit to new hex
    unitPiece.moveUnitTo(selectedUnitForMove.id, hex.label);
    selectedUnitForMove = null;
    render();
    return;
  }

  selectedUnitForMove = null;
});


  cvs.onmousedown = e=>{ 
    drag=true; 
    start={x:e.clientX,y:e.clientY}; 
    selectedPiece = unitPiece.getPieceAt(start.x, start.y);drag = true;
    dragMoved = false;
    start = { x: e.clientX, y: e.clientY };

    // Check for unit click
    const r = cvs.getBoundingClientRect();
    const gx = (e.clientX - r.left - offX) / zoom;
    const gy = (e.clientY - r.top  - offY) / zoom;

    selectedPiece = getPieceAt(gx, gy);
  };
  cvs.onmousemove = e=>{
    if (draggedPiece) {
      const r = cvs.getBoundingClientRect();
      const gx = (e.clientX - r.left - offX) / zoom;
      const gy = (e.clientY - r.top  - offY) / zoom;

      draggedPiece.x = gx - draggedOffset.x;
      draggedPiece.y = gy - draggedOffset.y;

      render(); // update visuals
      return;
    }
    /* ---------- if dragging, pan ------------ */
    if (drag) {
      const dx = e.clientX - start.x,
            dy = e.clientY - start.y;

      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) dragMoved = true;
      offX += dx; offY += dy;
      start  = { x:e.clientX, y:e.clientY };
      render();                    // keep map moving
      return;                      // ⇠ skip hover logic this frame
    }

    /* ---------- not dragging → hover logic -- */
    const h = pick(e);             // same helper that finds hex under cursor
    if (h !== hoverHex) {          // changed hex → restart fade
      hoverHex   = h;
      labelAlpha = 0;
    }
  };
  cvs.onmousedown = e=>{
    drag = true;
    dragMoved = false;
    start = { x: e.clientX, y: e.clientY };

    const r = cvs.getBoundingClientRect();
    const gx = (e.clientX - r.left - offX) / zoom;
    const gy = (e.clientY - r.top  - offY) / zoom;

    const piece = unitPiece.getPieceAt(gx, gy);
    if (piece) {
      draggedPiece = piece;
      draggedOffset.x = gx - piece.x;
      draggedOffset.y = gy - piece.y;
    }
  };
  cvs.onmouseup = e => {
    drag = false;
    if (draggedPiece) {
      const h = pick(e);
      if (h) unitPiece.moveUnitTo(draggedPiece.id, h.label);
      draggedPiece = null;
      render();
      return;
    } 

    if (!dragMoved && selectedPiece) {
      const h = pick(e);
      if (h) {
        moveUnitTo(selectedPiece.id, h.label);
      }
    }

    selectedPiece = null;
    render();
  };
  cvs.onwheel     = e=>{ e.preventDefault(); zoom*=e.deltaY<0?1.1:0.9; render(); };
  /*
  cvs.onclick = e=>{
    if (dragMoved || draggedPiece) return;

    const h = pick(e);
    if (!h) return;

    // example: place new unit
    const newUnitId = crypto.randomUUID();
    unitPiece.addUnitPiece({ id: newUnitId, label: h.label, color: "blue", sprite: "gangrel" });
    render(); 
  };
  */
  cvs.ondblclick = e => {
    const r = cvs.getBoundingClientRect();
    const gx = (e.clientX - r.left - offX) / zoom;
    const gy = (e.clientY - r.top  - offY) / zoom;

    const piece = unitPiece.getPieceAt(gx, gy);

    if (piece) {
      showUnitModal(piece);
      return;
    }

    const h = pick(e);
    if (h) {
      sel = h.label;
      render();
      ui.openModal(`Field ${h.label}`, "(your field data)");
    }
  };


  cvs.oncontextmenu = e => {
    e.preventDefault();

    const r = cvs.getBoundingClientRect();
    const gx = (e.clientX - r.left - offX) / zoom;
    const gy = (e.clientY - r.top - offY) / zoom;
    const h  = pick(e);
    const piece = unitPiece.getPieceAt(gx, gy);

    if (!h) return;

    // build menu dynamically
    contextMenu.innerHTML = "";

    const addItem = (label, action) => {
      const li = document.createElement("li");
      li.textContent = label;
      li.style.padding = "4px 10px";
      li.style.cursor = "pointer";
      li.onmouseenter = () => (li.style.background = "#444");
      li.onmouseleave = () => (li.style.background = "none");
      li.onclick = () => {
        contextMenu.style.display = "none";
        action();
      };
      contextMenu.appendChild(li);
    };

    addItem("Show Modal", () => {
      if (piece) {
        showUnitModal(piece);
      } else {
        ui.openModal(`Field ${h.label}`, "(your field data)");
      }
    });

    if (piece) {
      addItem("Remove Unit", () => {
        unitPiece.removeUnit(piece.id);
        render();
      });
    } else {
      addItem("Add Unit", () => {
        showUnitSelector((chosenUnitId) => {
          const unit = unitData.getUnitById(chosenUnitId);
          if (!unit) return;

          unitPiece.addUnitPiece({
            id: crypto.randomUUID(),     // unique instance
            label: h.label,              // hex
            type: unit.id,               // the type from units.json
            color: "red"                 // optional styling
          });

          render();
        });
      });
    }
    contextMenu.style.left = `${e.pageX}px`;
    contextMenu.style.top  = `${e.pageY}px`;
    contextMenu.style.display = "block";
  };
}
window.addEventListener("click", (e) => {
  const menu = document.getElementById("contextMenu");
  if (!menu.contains(e.target)) {
    menu.style.display = "none";
  }
});
/* ---------- keyboard shortcuts ---------- */
window.onkeydown = (e) => {
  if (e.key === "Delete" && selectedPiece) {
    unitPiece.removeUnit(selectedPiece.id);
    selectedPiece = null;
    render();
  }
};
window.onresize = ()=>{ cvs.width=innerWidth; cvs.height=innerHeight; render(); };

async function init() {
  // Load unit data and sprites
  await unitData.loadUnitData().then(() => {
    unitPiece.loadUnitSpritesFromUnitData(unitData.getAllUnits());

    build();
    render();
    initUI();

    bindCanvasEvents(); 
  });        
}
init().catch(console.error);

/* Start the animation loop */
requestAnimationFrame(tick);

// Export hexes for unitPiece module to use
export { hexes };

// Save
document.getElementById("save").onclick = async () => {
  const name = prompt("Enter save name:");
  const password = prompt("Enter save password:");
  if (!name || !password) return;

  const json = JSON.parse(unitPiece.exportMapState());

  try {
    await saveGameState(name, json, password);
    alert("✅ Save successful.");
  } catch (err) {
    alert(err.message);
  }
};
// Load
document.getElementById("load").onclick = async () => {
  const name = prompt("Enter save name to load:");
  const password = prompt("Enter password:");
  if (!name || !password) return;

  try {
    const data = await loadGameState(name, password);
    unitPiece.importMapState(JSON.stringify(data));
    render();
    alert("✅ Load successful.");
  } catch (err) {
    alert(err.message);
  }
};
