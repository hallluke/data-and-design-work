"use strict";

// Shared state synchronisation for existing button groups.
// Chart modules still own their selection and dependency rules.
function syncButtonGroup(buttons, selected, dataKey) {
  for (const button of buttons) {
    button.setAttribute("aria-pressed", String(button.dataset[dataKey] === selected));
  }
}

function setControlDisabled(control, disabled) {
  control.disabled = Boolean(disabled);
  // Native disabled state handles keyboard/mouse behaviour; mirror for existing CSS.
  control.setAttribute("aria-disabled", String(control.disabled));
}

export { syncButtonGroup, setControlDisabled };
