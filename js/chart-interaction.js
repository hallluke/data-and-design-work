import { hideTooltip } from "./chart-tooltip.js";

// Keep touch selection stable until a deliberate dismissal; never intercept scrolling.
export function installTouchDismissal(chart, tooltip, {clear = () => {}, preserveKeyboardScroll = false} = {}) {
  let touchStart = null;
  let touchScrolling = false;
  let lastTouch = 0;
  const dismiss = () => { hideTooltip(tooltip); clear(); };
  const dismissScroll = () => { dismiss(); if (chart.contains(document.activeElement)) document.activeElement.blur(); };
  const start = e => { if (e.pointerType === "touch") { touchStart = {x:e.clientX,y:e.clientY}; touchScrolling = false; lastTouch = Date.now(); } };
  const end = () => { touchStart = null; };
  const move = e => {
    if (e.pointerType === "touch" && touchStart && Math.hypot(e.clientX-touchStart.x,e.clientY-touchStart.y)>7) { touchScrolling = true; dismissScroll(); }
  };
  const scroll = () => {
    if (touchStart) touchScrolling = true;
    if (preserveKeyboardScroll && chart.contains(document.activeElement) && !touchStart && Date.now()-lastTouch>1200) return;
    dismissScroll();
  };
  const outside = e => { if (!chart.contains(e.target) && !tooltip.contains(e.target)) dismiss(); };
  const escape = e => { if (e.key === "Escape" && (chart.contains(document.activeElement) || !tooltip.hidden)) dismiss(); };
  const touchMove = e => {
    if (!touchStart || !e.touches?.length) return;
    const touch = e.touches[0];
    if (Math.hypot(touch.clientX-touchStart.x,touch.clientY-touchStart.y)>7) { touchScrolling=true; dismissScroll(); }
  };
  document.addEventListener("touchmove",touchMove,{passive:true,capture:true});
  chart.addEventListener("pointerdown",start);
  chart.addEventListener("pointermove",move);
  chart.addEventListener("pointerup",end);
  chart.addEventListener("pointercancel",end);
  document.addEventListener("pointerdown",outside);
  document.addEventListener("keydown",escape);
  // Capture page scrolling and horizontal calendar scrolling alike.
  window.addEventListener("scroll",scroll,{passive:true,capture:true});
  chart.addEventListener("touchend", () => { touchStart = null; }, {passive:true});
  return () => {
    document.removeEventListener("touchmove",touchMove,true);
    chart.removeEventListener("pointerdown",start);
    chart.removeEventListener("pointermove",move);
    chart.removeEventListener("pointerup",end);
    chart.removeEventListener("pointercancel",end);
    document.removeEventListener("pointerdown",outside);
    document.removeEventListener("keydown",escape);
    window.removeEventListener("scroll",scroll,true);
  };
}

export function isTouchPointer(event) { return event.pointerType === "touch" || event.pointerType === "pen"; }

// Scrollable disclosure regions should enter the Tab sequence only if scrolling is possible.
export function syncScrollableTableFocus(root = document) {
  const update = () => root.querySelectorAll(".disclosure-panel .table-scroll").forEach(el => {
    el.tabIndex = el.scrollWidth > el.clientWidth + 1 || el.scrollHeight > el.clientHeight + 1 ? 0 : -1;
  });
  update();
  const observer = new ResizeObserver(update);
  root.querySelectorAll(".disclosure-panel .table-scroll, .disclosure-panel .table-scroll table").forEach(el => observer.observe(el));
  root.querySelectorAll("details").forEach(el => el.addEventListener("toggle", update));
  window.addEventListener("resize", update);
  return () => { observer.disconnect(); window.removeEventListener("resize",update); };
}
