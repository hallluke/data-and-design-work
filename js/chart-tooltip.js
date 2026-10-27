// Tooltip lifecycle is shared; content and hover semantics remain chart-owned.
export function showTooltip(tooltip, html) {
  if (html !== undefined) tooltip.innerHTML = html;
  tooltip.hidden = false;
}

export function hideTooltip(tooltip) {
  tooltip.hidden = true;
}

// Viewport positioning for fixed-position tooltips (the calendar heatmap).
// Do not recalculate content or dimensions in the caller on each pointer move.
export function positionFixedTooltip(tooltip, event, {gap = 12, edge = 6, verticalGap = 10, flipBoundary = null} = {}) {
  const width = tooltip.offsetWidth;
  const height = tooltip.offsetHeight;
  const preferLeft = flipBoundary !== null && event.clientX + gap + width > flipBoundary;
  const preferredX = preferLeft ? event.clientX - gap - width : event.clientX + gap;
  tooltip.style.left = Math.max(edge, Math.min(preferredX, window.innerWidth - width - edge)) + "px";
  tooltip.style.top = Math.max(edge, Math.min(event.clientY - height - verticalGap, window.innerHeight - height - edge)) + "px";
}
