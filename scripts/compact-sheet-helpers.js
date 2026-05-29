import {
  ART_EDIT_SELECTOR,
  FEATURE_DESCRIPTION_SELECTOR,
  SCROLLABLE_PANEL_SELECTOR
} from "./constants.js";

const FEATURE_TOGGLE_ACTION = "toggleExtended";
const FEATURE_TOGGLE_TARGET_SELECTOR = ":scope > .inventory-item-header .item-name, :scope > .inventory-item-header .feature-form";
const COMPACT_HEADER_SELECTOR = ".dhca-section--header";
const COMPACT_HEADER_NAME_SELECTOR = ".dhca-header__name";
const COMPACT_WINDOW_DRAGGING_CLASS = "dhca-window-dragging";
const COMPACT_WINDOW_DRAG_READY_CLASS = "dhca-title-gap-drag-ready";
const COMPACT_WINDOW_HEADER_SELECTOR = ".window-header";
const COMPACT_WINDOW_CONTROL_SELECTOR = [
  ".window-header .header-button",
  ".window-header button",
  ".window-header a"
].join(", ");
const COMPACT_WINDOW_DRAG_EXCLUDE_SELECTOR = [
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "[contenteditable]",
  "[data-action]",
  ".dhca-header__toolbar",
  ".dhca-header__art-edit"
].join(", ");

export function createCompactDefaultOptions(BaseSheet, position = {}) {
  return foundry.utils.mergeObject(
    foundry.utils.deepClone(BaseSheet.DEFAULT_OPTIONS),
    {
      classes: [...new Set([...(BaseSheet.DEFAULT_OPTIONS.classes ?? []), "dh-compact"])],
      position: {
        ...(BaseSheet.DEFAULT_OPTIONS.position ?? {}),
        ...position
      }
    },
    { inplace: false }
  );
}

export function createCompactParts(BaseSheet, parts) {
  return foundry.utils.mergeObject(
    foundry.utils.deepClone(BaseSheet.PARTS),
    parts,
    { inplace: false }
  );
}

export function createTemplatePart(template, { scrollable = false } = {}) {
  return scrollable
    ? { template, scrollable: [SCROLLABLE_PANEL_SELECTOR] }
    : { template };
}

export function refreshRenderController(controller) {
  controller?.abort();
  return new AbortController();
}

export function closeRenderController(controller) {
  controller?.abort();
  return null;
}

export function expandFeatureDescriptions(element) {
  if (!element) return;

  for (const description of element.querySelectorAll(FEATURE_DESCRIPTION_SELECTOR)) {
    description.classList.add("extended");
  }
}

export function inlineFeatureDescriptions(element, signal = null) {
  if (!element) return;

  const inlineDescriptions = () => {
    for (const item of element.querySelectorAll(".dhca-tab-panel--features .inventory-item")) {
      inlineFeatureDescription(item);
      scopeFeatureDescriptionToggle(item);
    }
  };

  inlineDescriptions();
  requestAnimationFrame(inlineDescriptions);

  if (!signal || signal.aborted) return;

  let pending = false;
  const observer = new MutationObserver(() => {
    if (pending) return;
    pending = true;

    requestAnimationFrame(() => {
      pending = false;
      inlineDescriptions();
    });
  });

  observer.observe(element, {
    childList: true,
    subtree: true
  });

  signal.addEventListener("abort", () => observer.disconnect(), { once: true });
}

function inlineFeatureDescription(item) {
  if (item.querySelector(":scope > .inventory-item-header .dhca-feature-inline-description")) return;

  const label = item.querySelector(":scope > .inventory-item-header .item-label");
  const description = item.querySelector(":scope > .inventory-item-content.extensible > .invetory-description");
  const firstParagraph = description?.querySelector(":scope > p");

  if (!label || !firstParagraph || !firstParagraph.textContent.trim()) return;

  const featureForm = label.querySelector(".feature-form");
  const featureFormText = featureForm?.querySelector(".recall-value");
  const itemName = label.querySelector(".item-name");

  if (featureFormText) {
    featureFormText.textContent = featureFormText.textContent.trimEnd().replace(/:+$/, "");
  }

  removeEmptyTextNodes(featureForm);

  if (!featureForm && itemName) {
    const titleColon = label.querySelector(".dhca-feature-inline-title-colon")
      ?? document.createElement("span");
    titleColon.textContent = ":";
    titleColon.className = "dhca-feature-inline-title-colon";
    itemName.append(titleColon);
  }

  if (featureForm && !featureForm.querySelector(":scope > .dhca-feature-inline-colon")) {
    const colon = document.createElement("span");
    colon.className = "dhca-feature-inline-colon";
    colon.textContent = ":";
    featureForm.append(colon);
  }

  const inlineDescription = document.createElement("span");
  inlineDescription.className = "dhca-feature-inline-description";

  while (firstParagraph.firstChild) {
    inlineDescription.append(firstParagraph.firstChild);
  }

  firstParagraph.remove();
  item.classList.toggle("dhca-feature-inline-only", !description.textContent.trim());
  label.append(document.createTextNode(" "), inlineDescription);
}

function scopeFeatureDescriptionToggle(item) {
  const description = item.querySelector(":scope > .inventory-item-content.extensible");
  if (!description) return;

  const header = item.querySelector(":scope > .inventory-item-header");
  if (header?.dataset.action === FEATURE_TOGGLE_ACTION) {
    delete header.dataset.action;
  }

  for (const target of item.querySelectorAll(FEATURE_TOGGLE_TARGET_SELECTOR)) {
    if (!target.dataset.action) target.dataset.action = FEATURE_TOGGLE_ACTION;
    target.classList.add("dhca-feature-toggle-target");
  }
}

function removeEmptyTextNodes(element) {
  if (!element) return;

  for (const node of Array.from(element.childNodes)) {
    if (node.nodeType === Node.TEXT_NODE && !node.textContent.trim()) {
      node.remove();
    }
  }
}

export function bindCompactImageEditButtons(element, signal, handler) {
  if (!element || !signal) return;

  for (const button of element.querySelectorAll(ART_EDIT_SELECTOR)) {
    button.addEventListener("click", handler, { signal });
  }
}

export function bindCompactWindowTitleGapDrag(sheet, element, signal) {
  if (!sheet || !element || !signal) return;

  const header = element.querySelector(COMPACT_HEADER_SELECTOR);
  if (!header) return;

  const setDragCursor = (ready) => {
    element.classList.toggle(COMPACT_WINDOW_DRAG_READY_CLASS, ready);
    document.body.classList.toggle(COMPACT_WINDOW_DRAG_READY_CLASS, ready);
  };
  const updateDragCursor = (event) => {
    setDragCursor(
      isCompactTitleGapDragStart(sheet, header, event, { requirePrimaryButton: false })
    );
  };
  const clearDragCursor = () => setDragCursor(false);

  element.addEventListener("pointermove", updateDragCursor, { signal });
  element.addEventListener("pointerleave", clearDragCursor, { signal });
  element.addEventListener("pointercancel", clearDragCursor, { signal });
  element.addEventListener("pointerdown", (event) => {
    if (!isCompactTitleGapDragStart(sheet, header, event)) return;
    blurCompactActiveEditable(element);
    beginCompactWindowDrag(sheet, event, signal);
  }, { signal });
  element.addEventListener("dblclick", (event) => {
    if (!isCompactTitleGapDragStart(sheet, header, event, { requirePrimaryButton: false })) return;

    event.preventDefault();
    event.stopPropagation();
    blurCompactActiveEditable(element);
    clearDragCursor();
    toggleCompactWindowMinimized(sheet, element);
  }, { signal });
  signal.addEventListener("abort", clearDragCursor, { once: true });
}

export function isCompactSheetEditable(sheet) {
  return sheet.isEditable ?? sheet.document.isOwner ?? false;
}

export function openCompactImagePicker(sheet, event) {
  event.preventDefault();
  event.stopPropagation();

  if (!isCompactSheetEditable(sheet)) return null;

  const target = event.currentTarget;
  const attr = target.dataset.dhcaEdit ?? "img";
  const current = foundry.utils.getProperty(sheet.document, attr);
  const { img } = sheet.document.constructor.getDefaultArtwork?.(sheet.document.toObject()) ?? {};

  const picker = new foundry.applications.apps.FilePicker.implementation({
    current,
    type: "image",
    redirectToRoot: img ? [img] : [],
    callback: async (path) => {
      await sheet.document.update({ [attr]: path });
    },
    top: sheet.position.top + 40,
    left: sheet.position.left + 10
  });

  return picker.browse();
}

function isCompactTitleGapDragStart(sheet, header, event, { requirePrimaryButton = true } = {}) {
  if (requirePrimaryButton && event.button !== 0) return false;
  if (!(event.target instanceof Element)) return false;
  if (event.target.closest(COMPACT_WINDOW_DRAG_EXCLUDE_SELECTOR)) return false;

  const name = header.querySelector(COMPACT_HEADER_NAME_SELECTOR);
  const nameRect = name?.getBoundingClientRect();
  const headerRect = header.getBoundingClientRect();
  const rowTop = headerRect.top;
  const rowBottom = nameRect?.bottom ?? Math.min(headerRect.bottom, headerRect.top + 36);

  if (event.clientY < rowTop - 4 || event.clientY > rowBottom + 4) return false;

  const controlsLeft = getCompactWindowControlsLeft(sheet.element);
  if (Number.isFinite(controlsLeft) && event.clientX >= controlsLeft) return false;

  return true;
}

function getCompactWindowControlsLeft(element) {
  if (!element) return null;

  let left = Infinity;
  for (const control of element.querySelectorAll(COMPACT_WINDOW_CONTROL_SELECTOR)) {
    const rect = control.getBoundingClientRect();
    if (rect.width <= 0 && rect.height <= 0) continue;
    left = Math.min(left, rect.left);
  }

  if (Number.isFinite(left)) return left;
  return element.querySelector(COMPACT_WINDOW_HEADER_SELECTOR)?.getBoundingClientRect().left ?? null;
}

function blurCompactActiveEditable(element) {
  const activeElement = document.activeElement;
  if (!(activeElement instanceof HTMLElement)) return;
  if (!element.contains(activeElement)) return;
  if (!activeElement.matches("input, textarea, select, [contenteditable]")) return;

  activeElement.blur();
}

function toggleCompactWindowMinimized(sheet, element) {
  if (element?.classList?.contains("minimized")) {
    sheet.maximize?.();
    return;
  }

  sheet.minimize?.();
}

function beginCompactWindowDrag(sheet, event, signal) {
  const element = sheet.element;
  if (!element || typeof sheet.setPosition !== "function") return;

  const startLeft = Number(sheet.position?.left ?? element.offsetLeft ?? 0);
  const startTop = Number(sheet.position?.top ?? element.offsetTop ?? 0);
  if (!Number.isFinite(startLeft) || !Number.isFinite(startTop)) return;

  const startX = event.clientX;
  const startY = event.clientY;
  const pointerId = event.pointerId;
  const initialUserSelect = document.body.style.userSelect;
  let cleanedUp = false;

  event.preventDefault();
  event.stopPropagation();
  sheet.bringToFront?.();
  document.body.classList.add(COMPACT_WINDOW_DRAGGING_CLASS);
  document.body.style.userSelect = "none";

  const cleanup = () => {
    if (cleanedUp) return;
    cleanedUp = true;
    document.removeEventListener("pointermove", onPointerMove);
    document.removeEventListener("pointerup", onPointerUp);
    document.removeEventListener("pointercancel", onPointerUp);
    signal.removeEventListener("abort", cleanup);
    element.classList.remove(COMPACT_WINDOW_DRAG_READY_CLASS);
    document.body.classList.remove(COMPACT_WINDOW_DRAG_READY_CLASS);
    document.body.classList.remove(COMPACT_WINDOW_DRAGGING_CLASS);
    document.body.style.userSelect = initialUserSelect;
  };

  const onPointerMove = (moveEvent) => {
    if (moveEvent.pointerId !== pointerId) return;

    moveEvent.preventDefault();
    sheet.setPosition({
      left: startLeft + moveEvent.clientX - startX,
      top: startTop + moveEvent.clientY - startY
    });
  };

  const onPointerUp = (upEvent) => {
    if (upEvent.pointerId !== pointerId) return;
    cleanup();
  };

  document.addEventListener("pointermove", onPointerMove);
  document.addEventListener("pointerup", onPointerUp);
  document.addEventListener("pointercancel", onPointerUp);
  signal.addEventListener("abort", cleanup, { once: true });
}

export function buildTabNavContext(tabs, entries) {
  return entries.map(({ id, icon }) => {
    const tab = tabs?.[id] ?? {};

    return {
      cssClass: tab.cssClass ?? "",
      group: tab.group ?? "",
      icon,
      id: tab.id ?? id,
      label: tab.label ?? id
    };
  });
}
