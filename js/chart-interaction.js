import { hideTooltip } from "./chart-tooltip.js";

// Keep touch selection stable until a deliberate dismissal; never intercept scrolling.
export function installTouchDismissal(chart, tooltip, {clear = () => {}} = {}) {
  let touchStart = null;
  const dismiss = () => { hideTooltip(tooltip); clear(); };
  const start = e => { if (e.pointerType === "touch") touchStart = {x:e.clientX,y:e.clientY}; };
  const move = e => {
    if (e.pointerType === "touch" && touchStart && Math.hypot(e.clientX-touchStart.x,e.clientY-touchStart.y)>7) dismiss();
  };
  const scroll = () => dismiss();
  const outside = e => { if (!chart.contains(e.target) && !tooltip.contains(e.target)) dismiss(); };
  const escape = e => { if (e.key === "Escape" && (chart.contains(document.activeElement) || !tooltip.hidden)) dismiss(); };
  chart.addEventListener("pointerdown",start);
  chart.addEventListener("pointermove",move);
  document.addEventListener("pointerdown",outside);
  document.addEventListener("keydown",escape);
  // Capture page scrolling and horizontal calendar scrolling alike.
  window.addEventListener("scroll",scroll,{passive:true,capture:true});
  return () => {
    chart.removeEventListener("pointerdown",start);
    chart.removeEventListener("pointermove",move);
    document.removeEventListener("pointerdown",outside);
    document.removeEventListener("keydown",escape);
    window.removeEventListener("scroll",scroll,true);
  };
}

export function isTouchPointer(event) { return event.pointerType === "touch" || event.pointerType === "pen"; }
