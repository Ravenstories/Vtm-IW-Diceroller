/* =========  IMPORT UI HELPERS  ========= */
import { initUI  } from './mapUI.js';
const ui = initUI();
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
  ctx.restore();
}


/* ---------- util ---------- */
function pick(evt){
  const r=cvs.getBoundingClientRect();
  const gx=(evt.clientX-r.left-offX)/zoom,
        gy=(evt.clientY-r.top -offY)/zoom;
  return hexes.find(h=>Math.hypot(gx-h.x,gy-h.y)<HEX_R*0.9);
}

/* ---------- events ---------- */
cvs.onmousedown = e=>{ drag=true; start={x:e.clientX,y:e.clientY}; };
cvs.onmousemove = e=>{
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
  dragMoved = false;               // reset on every press
  start = { x:e.clientX, y:e.clientY };
};
cvs.onmouseup   = ()=> drag=false;
cvs.onwheel     = e=>{ e.preventDefault(); zoom*=e.deltaY<0?1.1:0.9; render(); };
cvs.onclick = e=>{
  if(dragMoved) return;                 // 👉 ignore if it was a drag

  const h = pick(e);
  if(!h){ sel=null; render(); return; }

  sel = h.label; render();
  ui.openModal(`Field ${h.label}`, "(your field data)");
};
function tick(){
  // fade toward 1 if hovering, toward 0 otherwise
  const target = hoverHex ? 1 : 0;
  labelAlpha  += (target - labelAlpha) * 0.15;   // easing
  render();
  requestAnimationFrame(tick);
}

window.onresize = ()=>{ cvs.width=innerWidth; cvs.height=innerHeight; render(); };
img.onload      = ()=>{ build(); render(); initUI(); };
requestAnimationFrame(tick);
