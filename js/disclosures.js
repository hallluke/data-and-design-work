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
  // Associate sibling chart, trigger and expanded panel without moving DOM nodes.
  const chartIds = ["monthly-material-weights", "yearly-material-comparison", "overall-recycling-rate", "daily-material-weights"];
  buttons.forEach((button, index) => {
    const article = root.querySelector(`[data-chart-id="${chartIds[index]}"]`);
    const trigger = button.closest(".disclosure-trigger");
    const panel = root.getElementById(button.dataset.disclosure);
    if (!article || !trigger || !panel) return;
    const update = () => {
      const attending = trigger.matches(":hover, :focus-within") ||
        (!panel.hidden && panel.matches(":hover, :focus-within"));
      article.classList.toggle("is-disclosure-attended", attending);
      trigger.classList.toggle("is-disclosure-attended", attending);
    };
    [trigger, panel].forEach(element => {
      for (const event of ["pointerenter", "pointerleave", "focusin", "focusout"]) {
        element.addEventListener(event, update);
      }
    });
    button.addEventListener("click", () => requestAnimationFrame(update));
  });
  const layout = window.matchMedia(MULTI_COLUMN_MEDIA);
  const reconcile = () => {
    if (!layout.matches) return;
    const expanded = buttons.filter(b => b.getAttribute("aria-expanded") === "true");
    expanded.slice(1).forEach(b => {
      b.setAttribute("aria-expanded", "false");
      root.getElementById(b.dataset.disclosure).hidden = true;
    });
  };
  layout.addEventListener("change", reconcile);
}

/* Figure 03 — recorded-weight recycling share. Independent of imputed charts. */

export { initDisclosures };
