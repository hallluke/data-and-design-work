import { MULTI_COLUMN_MEDIA } from "./chart-style.js";

function initDisclosures(root = document) {
  const buttons = [...root.querySelectorAll("[data-disclosure]")];
  buttons.forEach(button => button.addEventListener("click", () => {
    const wasExpanded = button.getAttribute("aria-expanded") === "true";
    // Match the single-column CSS breakpoint. On narrow screens the
    // disclosures are independent; in the multi-column layout they are exclusive.
    if (window.matchMedia(MULTI_COLUMN_MEDIA).matches) {
      buttons.forEach(other => {
        other.setAttribute("aria-expanded", "false");
        root.getElementById(other.dataset.disclosure).hidden = true;
      });
    }
    // Toggle the clicked disclosure in both layouts. On wide screens,
    // the loop above first closes any other open disclosure.
    button.setAttribute("aria-expanded", String(!wasExpanded));
    root.getElementById(button.dataset.disclosure).hidden = wasExpanded;
  }));
  // Pointer and keyboard attention are deliberately independent. Mouse-click
  // focus must not leave a chart highlighted after the pointer moves away.
  let keyboardMode = false;
  let pointerPosition = null;
  let scheduled = false;
  const pairs = [];
  const chartIds = ["monthly-material-weights", "yearly-material-comparison", "overall-recycling-rate", "daily-material-weights"];
  buttons.forEach((button, index) => {
    const article = root.querySelector(`[data-chart-id="${chartIds[index]}"]`);
    const trigger = button.closest(".disclosure-trigger");
    const panel = root.getElementById(button.dataset.disclosure);
    const method = panel?.querySelector(".method-copy");
    const table = panel?.querySelector(".table-scroll");
    if (article && trigger && panel && method && table) {
      pairs.push({ article, trigger, panel, method, table, button, index, bounds: null });
    }
  });
  const within = (point, rect) => Boolean(point && rect &&
    point.x >= rect.left && point.x <= rect.right &&
    point.y >= rect.top && point.y <= rect.bottom);

  function measure() {
    for (const pair of pairs) {
      if (pair.panel.hidden) { pair.bounds = null; continue; }
      const panel = pair.panel.getBoundingClientRect();
      if (pair.index % 2 === 1) {
        // Figures 02 and 04: retain the original full-panel hover area.
        pair.bounds = panel;
      } else {
        // Figures 01 and 03: include the method/table gap, but not the
        // unused right or lower portion of the disclosure panel.
        const method = pair.method.getBoundingClientRect();
        const table = pair.table.getBoundingClientRect();
        pair.bounds = {
          left: panel.left,
          right: Math.min(panel.right, Math.max(method.right, table.right)),
          top: Math.min(method.top, table.top),
          bottom: Math.max(method.bottom, table.bottom)
        };
      }
    }
  }
  function refreshAttention() {
    const active = root.activeElement;
    for (const { article, trigger, panel, button, bounds } of pairs) {
      const chartKeyboard = keyboardMode && article.contains(active);
      const disclosureKeyboard = keyboardMode &&
        (trigger.contains(active) || (!panel.hidden && panel.contains(active)));
      const disclosurePointer = within(pointerPosition, bounds) ||
        within(pointerPosition, trigger.getBoundingClientRect());
      article.classList.toggle("is-keyboard-attended", chartKeyboard);
      article.classList.toggle("is-disclosure-attended", disclosurePointer || disclosureKeyboard);
      trigger.classList.toggle("is-disclosure-attended", disclosurePointer || disclosureKeyboard);
      button.classList.toggle("is-keyboard-attended", disclosureKeyboard);
    }
  }
  function scheduleRefresh() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(() => {
      scheduled = false;
      measure();
      refreshAttention();
    });
  }
  root.addEventListener("pointermove", event => {
    if (event.pointerType === "touch") return;
    pointerPosition = { x: event.clientX, y: event.clientY };
    // Rectangles are cached; only layout changes trigger measurements.
    refreshAttention();
  }, { passive: true });
  root.addEventListener("pointerdown", event => {
    keyboardMode = false;
    if (event.pointerType !== "touch") pointerPosition = { x: event.clientX, y: event.clientY };
    refreshAttention();
  }, true);
  document.addEventListener("pointerleave", () => { pointerPosition = null; refreshAttention(); });
  window.addEventListener("blur", () => { pointerPosition = null; refreshAttention(); });
  root.addEventListener("keydown", event => {
    if (event.key === "Tab" || event.key.startsWith("Arrow") || event.key === "Enter" || event.key === " ") {
      keyboardMode = true;
      queueMicrotask(refreshAttention);
    }
  }, true);
  root.addEventListener("focusin", () => queueMicrotask(refreshAttention), true);
  root.addEventListener("focusout", () => queueMicrotask(refreshAttention), true);
  // Dynamic table contents, wrapping and scroll-container size may change
  // without a viewport resize. ResizeObserver tracks the visible boxes;
  // MutationObserver also covers changes to hidden panels and table markup.
  const resizeObserver = new ResizeObserver(scheduleRefresh);
  const mutationObserver = new MutationObserver(scheduleRefresh);
  for (const { panel, method, table, button } of pairs) {
    for (const element of [panel, method, table]) resizeObserver.observe(element);
    mutationObserver.observe(panel, { attributes: true, attributeFilter: ["hidden"] });
    mutationObserver.observe(table, { childList: true, subtree: true, characterData: true });
    mutationObserver.observe(method, { childList: true, subtree: true, characterData: true });
    button.addEventListener("click", scheduleRefresh);
  }
  window.addEventListener("resize", scheduleRefresh, { passive: true });
  window.addEventListener("scroll", scheduleRefresh, { passive: true, capture: true });
  document.fonts?.ready.then(scheduleRefresh);
  scheduleRefresh();
  const layout = window.matchMedia(MULTI_COLUMN_MEDIA);
  const reconcile = () => {
    if (!layout.matches) return;
    const expanded = buttons.filter(b => b.getAttribute("aria-expanded") === "true");
    expanded.slice(1).forEach(b => {
      b.setAttribute("aria-expanded", "false");
      root.getElementById(b.dataset.disclosure).hidden = true;
    });
  };
  layout.addEventListener("change", () => { reconcile(); scheduleRefresh(); });
}

/* Figure 03 — recorded-weight recycling share. Independent of imputed charts. */

export { initDisclosures };
