/* =========  IMPORT UI HELPERS  ========= */
import * as unitPiece from './unitPiece.js';
import { initUI  } from './mapUI.js';
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
function drawHex(h, highlight=false, showLabel=false, alpha=1){
  ctx.beginPath();
  for(let i=0;i<6;i++){
    const a=Math.PI/180*60*i;
    const px=h.x+HEX_R*Math.cos(a), py=h.y+HEX_R*Math.sin(a);
    i?ctx.lineTo(px,py):ctx.moveTo(px,py);
  }
  ctx.closePath();

  if(highlight){ ctx.fillStyle="rgba(180,0,0,.35)"; ctx.fill(); }
  ctx.strokeStyle="rgba(255,255,255,.15)"; ctx.stroke();

  if(showLabel){
    ctx.save();
    ctx.globalAlpha = alpha;                       // fade!
    ctx.fillStyle   = "#fff";
    ctx.font        = "11px sans-serif";
    ctx.textAlign   = "center";
    ctx.textBaseline= "middle";
    ctx.fillText(h.label,h.x,h.y);
    ctx.restore();
  }
}
function render(){
  ctx.setTransform(1,0,0,1,0,0);
  ctx.clearRect(0,0,cvs.width,cvs.height);

  ctx.save();
  ctx.translate(offX,offY);
  ctx.scale(zoom,zoom);
  ctx.drawImage(img,0,0);

  hexes.forEach(h=>{
    const isSel   = h.label===sel;
    const isHover = h===hoverHex;
    drawHex(h,isSel,isHover,labelAlpha);
  });
  unitPiece.drawUnitPieces(ctx, zoom); // draw unit pieces on top of hexes
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
/* ---------- events ---------- */
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
    ui.openModal(`Unit ${piece.id}`, "(unit info here)");
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
      ui.openModal(`Unit ${piece.id}`, `(unit info here)`);
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
      const id = crypto.randomUUID();
      const unitType = prompt("Enter unit type (e.g. GangrelWarband):");
      if (unitType) {
        unitPiece.addUnitPiece({ id, label: h.label, sprite: unitType });
        render();
      }
    });
  }

  contextMenu.style.left = `${e.pageX}px`;
  contextMenu.style.top  = `${e.pageY}px`;
  contextMenu.style.display = "block";
};

/* ---------- keyboard shortcuts ---------- */
window.onkeydown = (e) => {
  if (e.key === "Delete" && selectedPiece) {
    unitPiece.removeUnit(selectedPiece.id);
    selectedPiece = null;
    render();
  }
};
window.onresize = ()=>{ cvs.width=innerWidth; cvs.height=innerHeight; render(); };
img.onload      = ()=>{ 
  build();
  unitPiece.addUnitPiece({ id: "unit1", label: "D05", color: "purple" }); 
  render(); 
  initUI(); 
};

/* Start the animation loop */
requestAnimationFrame(tick);

// Export hexes for unitPiece module to use
export { hexes };

// Save and Load buttons functionality
document.getElementById("save").onclick = () => {
  const data = unitPiece.exportMapState();
  navigator.clipboard.writeText(data);
  alert("Map state copied to clipboard!");
};
document.getElementById("load").onclick = () => {
  const input = prompt("Paste map state JSON:");
  if (input) unitPiece.importMapState(input);
  render();
};

