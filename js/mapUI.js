// mapUI.js
export function initUI() {
  const tip        = document.getElementById("tooltip");
  const modal      = document.getElementById("modal");
  const modalClose = document.getElementById("modalClose");

  /* cache helpers inside the closure */
  function showTip(text, x, y) {
    tip.textContent = text;
    tip.style.left  = x + 12 + "px";
    tip.style.top   = y + 12 + "px";
    tip.style.display = "block";
  }
  function hideTip(){ tip.style.display = "none"; }
  function openModal(title, body) {
    modal.querySelector("h3").innerHTML  = title;
    modal.querySelector("p").innerHTML   = body;
    modal.style.display = "flex";
  }
  modalClose.onclick = () => (modal.style.display = "none");

  /* expose helpers on the module object */
  return { showTip, hideTip, openModal };
}
