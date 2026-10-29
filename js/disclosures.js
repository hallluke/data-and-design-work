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
  // Attention is pointer-hover OR keyboard focus, not retained mouse-click focus.
  // A clicked select/button remains focused in browsers even after the pointer
  // moves elsewhere; :focus-within would therefore leave its highlight stuck.
  let keyboardMode = false;
  const pairs = [];
  const chartIds = ["monthly-material-weights", "yearly-material-comparison", "overall-recycling-rate", "daily-material-weights"];
  buttons.forEach((button, index) => {
    const article = root.querySelector(`[data-chart-id="${chartIds[index]}"]`);
    const trigger = button.closest(".disclosure-trigger");
    const panel = root.getElementById(button.dataset.disclosure);
    if (article && trigger && panel) pairs.push({ article, trigger, panel, button });
  });
  function refreshAttention() {
    const active = root.activeElement;
    for (const { article, trigger, panel, button } of pairs) {
      const chartKeyboard = keyboardMode && article.contains(active);
      const disclosureKeyboard = keyboardMode &&
        (trigger.contains(active) || (!panel.hidden && panel.contains(active)));
      const disclosurePointer = trigger.matches(":hover") ||
        (!panel.hidden && panel.matches(":hover"));
      article.classList.toggle("is-keyboard-attended", chartKeyboard);
      article.classList.toggle("is-disclosure-attended", disclosurePointer || disclosureKeyboard);
      trigger.classList.toggle("is-disclosure-attended", disclosurePointer || disclosureKeyboard);
      button.classList.toggle("is-keyboard-attended", disclosureKeyboard);
    }
  }
  // Track the input modality so pointer-click focus does not act like keyboard focus.
  root.addEventListener("pointerdown", () => { keyboardMode = false; refreshAttention(); }, true);
  root.addEventListener("keydown", event => {
    if (event.key === "Tab" || event.key.startsWith("Arrow") || event.key === "Enter" || event.key === " ") {
      keyboardMode = true;
      queueMicrotask(refreshAttention);
    }
  }, true);
  root.addEventListener("focusin", () => queueMicrotask(refreshAttention), true);
  root.addEventListener("focusout", () => queueMicrotask(refreshAttention), true);
  for (const { article, trigger, panel, button } of pairs) {
    for (const element of [article, trigger, panel]) {
      element.addEventListener("pointerenter", refreshAttention);
      element.addEventListener("pointerleave", refreshAttention);
    }
    button.addEventListener("click", () => requestAnimationFrame(refreshAttention));
  }
  refreshAttention();
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
