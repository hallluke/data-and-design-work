import { hideTooltip } from "./chart-display.js";

// A keyboard dismissal closes transient UI without erasing the visible position
// of focus. Charts may draw that indicator as selection styling rather than
// a native CSS outline (notably bars, slopes, and calendar cells).
export function dismissChartSelection({tooltip, clear, preserveKeyboardFocus = false, chart, activeElement = document.activeElement}) {
  hideTooltip(tooltip);
  if (preserveKeyboardFocus && chart?.contains(activeElement) && activeElement?.matches?.(":focus-visible")) return;
  clear();
}

// Keep touch selection stable until a deliberate dismissal; never intercept scrolling.
export function installTouchDismissal(chart, tooltip, {clear = () => {}, preserveKeyboardScroll = false, preserveKeyboardFocus = false} = {}) {
  let touchStart = null;
  let lastTouch = 0;
  const dismiss = () => { hideTooltip(tooltip); clear(); };
  const dismissScroll = () => { dismiss(); if (chart.contains(document.activeElement)) document.activeElement.blur(); };
  const start = e => { if (e.pointerType === "touch") { touchStart = {x:e.clientX,y:e.clientY}; lastTouch = Date.now(); } };
  const end = () => { touchStart = null; };
  const move = e => {
    if (e.pointerType === "touch" && touchStart && Math.hypot(e.clientX-touchStart.x,e.clientY-touchStart.y)>7) { dismissScroll(); }
  };
  const scroll = () => {
    if (preserveKeyboardScroll && chart.contains(document.activeElement) && !touchStart && Date.now()-lastTouch>1200) return;
    dismissScroll();
  };
  const outside = e => { if (!chart.contains(e.target) && !tooltip.contains(e.target)) dismiss(); };
  const escape = e => {
    if (e.key === "Escape" && (chart.contains(document.activeElement) || !tooltip.hidden))
      dismissChartSelection({tooltip, clear, preserveKeyboardFocus, chart});
  };
  const touchMove = e => {
    if (!touchStart || !e.touches?.length) return;
    const touch = e.touches[0];
    if (Math.hypot(touch.clientX-touchStart.x,touch.clientY-touchStart.y)>7) { dismissScroll(); }
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
  const touchEnd = () => { touchStart = null; };
  chart.addEventListener("touchend", touchEnd, {passive:true});
  return () => {
    document.removeEventListener("touchmove",touchMove,true);
    chart.removeEventListener("pointerdown",start);
    chart.removeEventListener("pointermove",move);
    chart.removeEventListener("pointerup",end);
    chart.removeEventListener("pointercancel",end);
    chart.removeEventListener("touchend",touchEnd);
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
  const details = [...root.querySelectorAll("details")];
  details.forEach(el => el.addEventListener("toggle", update));
  window.addEventListener("resize", update);
  return () => { observer.disconnect(); details.forEach(el => el.removeEventListener("toggle", update)); window.removeEventListener("resize",update); };
}

// Register persistent chart-owned listeners and their cleanup callbacks.
// Render-created SVG marks are replaced on redraw and need no persistent registry.
// Each chart owns its cleanup list and can be destroyed independently.
function bindChartEvent(listeners, target, event, handler) {
  target.addEventListener(event, handler);
  listeners.push(() => target.removeEventListener(event, handler));
}
export { bindChartEvent };
