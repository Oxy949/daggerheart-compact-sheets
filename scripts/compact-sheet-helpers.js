import {
  ART_CONTEXT_MENU_SELECTOR,
  FEATURE_DESCRIPTION_SELECTOR,
  RESOURCE_ROW_SELECTOR,
  RESOURCE_STEP_SELECTOR,
  RESOURCE_TRACK_MIN_SCALE,
  RESOURCE_TRACK_SHRINK_START_RATIO,
  SCROLLABLE_PANEL_SELECTOR
} from "./constants.js";
import { clampNumber, DEFAULT_ART_IMAGE, getCompactDocumentArt } from "./utils.js";

const FEATURE_TOGGLE_ACTION = "toggleExtended";
const FEATURE_ACTION_ROW_CLASS = "dhca-feature-actions";
const SUPPRESS_FEATURE_TRANSITION_CLASS = "dhca-suppress-feature-transition";
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
  ".dhca-header__toolbar"
].join(", ");
const ART_CONTEXT_MENU_CLASS = "dhca-art-context-menu";
const ART_CONTEXT_MENU_EXCLUDE_SELECTOR = [
  "button",
  "a",
  "input",
  "textarea",
  "select",
  "[contenteditable]",
  "[data-action]",
  ".dhca-header__toolbar",
  ".dhca-section--body",
  ".window-header"
].join(", ");
const ART_CONTEXT_MENU_ITEM_CLASS = "dhca-art-context-menu__item";
const ART_CONTEXT_MENU_SETTINGS_SELECTOR = '[data-action="openSettings"]';
const ART_CONTEXT_MENU_THEME_VARS = Object.freeze([
  ["--dhca-menu-bg", "--dhca-surface"],
  ["--dhca-menu-border", "--dhca-line"],
  ["--dhca-menu-text", "--dhca-text"],
  ["--dhca-menu-text-soft", "--dhca-text-soft"],
  ["--dhca-menu-hover-bg", "--dhca-button-bg-hover"],
  ["--dhca-menu-accent", "--dhca-accent-strong"],
  ["--dhca-menu-font", "--dhca-font-family"]
]);

let activeCompactArtContextMenuCleanup = null;

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

export function measureCompactTrackContentWidth(track) {
  if (!track) return 0;

  const styles = getComputedStyle(track);
  const padding = parseCssPixelValue(styles.paddingLeft) + parseCssPixelValue(styles.paddingRight);
  const gap = parseCssPixelValue(styles.columnGap);
  const children = Array.from(track.children);
  const childWidth = children.reduce((total, child) => total + child.getBoundingClientRect().width, 0);

  return padding + childWidth + gap * Math.max(children.length - 1, 0);
}

export function bindCompactResourceStepButtons(element, signal, handler) {
  if (!element || !signal || typeof handler !== "function") return;

  for (const button of element.querySelectorAll(RESOURCE_STEP_SELECTOR)) {
    button.addEventListener("click", handler, { signal });
  }
}

export function bindResponsiveResourceTracks(element, observer = null) {
  observer?.disconnect();

  if (!element) return null;

  const nextObserver = new ResizeObserver(() => updateResponsiveResourceTracks(element));

  for (const row of element.querySelectorAll(RESOURCE_ROW_SELECTOR)) {
    nextObserver.observe(row);
  }

  requestAnimationFrame(() => updateResponsiveResourceTracks(element));
  return nextObserver;
}

export function updateResponsiveResourceTracks(element) {
  if (!element) return;

  for (const row of element.querySelectorAll(RESOURCE_ROW_SELECTOR)) {
    const track = row.querySelector(".dhca-resource-row__track");
    if (!track) continue;

    row.style.setProperty("--dhca-resource-scale", "1");

    const availableWidth = track.clientWidth;
    const contentWidth = measureCompactTrackContentWidth(track);
    const targetWidth = availableWidth * RESOURCE_TRACK_SHRINK_START_RATIO;

    if (!availableWidth || !contentWidth || contentWidth <= targetWidth) continue;

    const scale = Math.max(Math.min(targetWidth / contentWidth, 1), RESOURCE_TRACK_MIN_SCALE);
    row.style.setProperty("--dhca-resource-scale", scale.toFixed(3));
  }
}

export async function handleCompactResourceStep(sheet, event) {
  event.preventDefault();
  event.stopPropagation();

  if (!isCompactSheetEditable(sheet)) return;

  const button = event.currentTarget;
  const resourceKey = button.dataset.dhcaResourceStep;
  const direction = Number(button.dataset.direction ?? 0);

  if (!resourceKey || !Number.isFinite(direction) || direction === 0) return;

  const current = getCompactResourceStepValue(sheet.document, resourceKey);
  if (!current) return;

  const nextValue = clampNumber(current.value + direction, 0, current.max);
  if (nextValue === current.value) return;

  button.disabled = true;
  const scrollSnapshot = captureCompactScrollPositions(sheet.element);

  try {
    await updateCompactResourceStepValue(sheet.document, resourceKey, nextValue, current.value);
    scheduleCompactScrollRestore(sheet, scrollSnapshot);
  } finally {
    button.disabled = !isCompactSheetEditable(sheet);
  }
}

function captureCompactScrollPositions(element) {
  if (!element) return [];

  return Array.from(element.querySelectorAll(SCROLLABLE_PANEL_SELECTOR))
    .map((scrollArea, index) => {
      const panel = scrollArea.closest(".dhca-tab-panel");

      return {
        group: panel?.dataset.group ?? "",
        index,
        left: scrollArea.scrollLeft,
        tab: panel?.dataset.tab ?? "",
        top: scrollArea.scrollTop
      };
    })
    .filter((position) => position.top || position.left);
}

function scheduleCompactScrollRestore(sheet, snapshot) {
  if (!sheet || !snapshot.length) return;

  let frames = 0;
  const restore = () => {
    restoreCompactScrollPositions(sheet.element, snapshot);
    frames += 1;

    if (frames < 8) requestAnimationFrame(restore);
  };

  requestAnimationFrame(restore);
}

function restoreCompactScrollPositions(element, snapshot) {
  if (!element || !snapshot.length) return;

  const scrollAreas = Array.from(element.querySelectorAll(SCROLLABLE_PANEL_SELECTOR));

  for (const position of snapshot) {
    const scrollArea = scrollAreas.find((candidate, index) => {
      const panel = candidate.closest(".dhca-tab-panel");

      return (
        panel?.dataset.tab === position.tab
        && panel?.dataset.group === position.group
      ) || index === position.index;
    });

    if (!scrollArea) continue;

    scrollArea.scrollTop = position.top;
    scrollArea.scrollLeft = position.left;
  }
}

export function expandFeatureDescriptions(element) {
  if (!element) return;

  const descriptions = element.querySelectorAll(FEATURE_DESCRIPTION_SELECTOR);
  if (!descriptions.length) return;

  element.classList.add(SUPPRESS_FEATURE_TRANSITION_CLASS);

  for (const description of descriptions) {
    description.classList.add("extended");
  }

  requestAnimationFrame(() => {
    requestAnimationFrame(() => element.classList.remove(SUPPRESS_FEATURE_TRANSITION_CLASS));
  });
}

export function inlineFeatureDescriptions(element, signal = null) {
  if (!element) return;

  const inlineDescriptions = () => {
    for (const item of element.querySelectorAll(".dhca-tab-panel--features .inventory-item")) {
      inlineFeatureDescription(item);
      moveFeatureResourcesToActions(item);
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

function moveFeatureResourcesToActions(item) {
  const resources = getFeatureResourceControls(item);
  if (!resources.length) return;

  const itemButtons = item.querySelector(":scope > .item-buttons");
  const actionRow = getOrCreateFeatureActionRow(item, itemButtons);
  if (!actionRow) return;

  for (const resource of resources) {
    if (resource.parentElement === actionRow) continue;
    actionRow.insertBefore(resource, itemButtons?.parentElement === actionRow ? itemButtons : null);
  }

  if (itemButtons && itemButtons.parentElement !== actionRow) {
    actionRow.append(itemButtons);
  }
}

function getFeatureResourceControls(item) {
  return [
    ...item.querySelectorAll(":scope > .inventory-item-header .item-resource"),
    ...item.querySelectorAll(":scope > .item-resources"),
    ...item.querySelectorAll(":scope > .item-resource")
  ].filter(isFeatureResourceControl);
}

function isFeatureResourceControl(element) {
  return element.classList.contains("item-resources")
    || element.classList.contains("die")
    || Boolean(element.querySelector(".inventory-item-resource, .item-dice-resource"));
}

function getOrCreateFeatureActionRow(item, itemButtons) {
  const existing = item.querySelector(`:scope > .${FEATURE_ACTION_ROW_CLASS}`);
  if (existing) return existing;

  const actionRow = document.createElement("div");
  actionRow.className = FEATURE_ACTION_ROW_CLASS;

  if (itemButtons) {
    itemButtons.before(actionRow);
    return actionRow;
  }

  const content = item.querySelector(":scope > .inventory-item-content");
  if (content) {
    content.after(actionRow);
    return actionRow;
  }

  item.append(actionRow);
  return actionRow;
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

export function bindCompactArtContextMenu(sheet, element, signal) {
  if (!sheet || !element || !signal) return;

  syncCompactArtImage(sheet, element, signal);

  element.addEventListener("contextmenu", (event) => {
    const art = getCompactArtContextMenuTarget(element, event);
    if (!art) return;

    openCompactArtContextMenu(sheet, event, signal, art);
  }, { capture: true, signal });

  signal.addEventListener("abort", closeCompactArtContextMenu, { once: true });
}

function syncCompactArtImage(sheet, element, signal) {
  const art = getCompactDocumentArt(sheet.document);

  for (const artElement of element.querySelectorAll(ART_CONTEXT_MENU_SELECTOR)) {
    if (!(artElement instanceof HTMLElement)) continue;

    artElement.classList.toggle("dhca-header__art--fallback", art.isFallback);
    artElement.dataset.dhcaDefaultArt = art.defaultImg;

    const image = artElement.querySelector(".dhca-header__art-image");
    if (!(image instanceof HTMLImageElement)) continue;

    if (image.getAttribute("src") !== art.img) image.src = art.img;

    image.addEventListener("error", () => {
      if (image.getAttribute("src") === DEFAULT_ART_IMAGE) return;
      artElement.classList.add("dhca-header__art--fallback");
      image.src = DEFAULT_ART_IMAGE;
    }, { signal });
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
  event?.preventDefault();
  event?.stopPropagation();

  if (!isCompactSheetEditable(sheet)) return null;

  const target = event?.currentTarget;
  const attr = target?.dataset?.dhcaEdit ?? "img";
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

function openCompactArtContextMenu(sheet, event, signal, art) {
  event.preventDefault();
  event.stopPropagation();

  const actions = buildCompactArtContextMenuActions(sheet, art);
  if (!actions.length) return;

  closeCompactArtContextMenu();

  const menu = document.createElement("div");
  menu.className = ART_CONTEXT_MENU_CLASS;
  menu.setAttribute("role", "menu");
  menu.tabIndex = -1;
  syncCompactArtContextMenuTheme(menu, sheet.element);

  for (const action of actions) {
    menu.append(createCompactArtContextMenuItem(action));
  }

  document.body.append(menu);
  positionCompactArtContextMenu(menu, event.clientX, event.clientY);

  const controller = new AbortController();
  const cleanup = () => {
    controller.abort();
    signal?.removeEventListener("abort", closeCompactArtContextMenu);
    menu.remove();
  };

  activeCompactArtContextMenuCleanup = cleanup;
  signal?.addEventListener("abort", closeCompactArtContextMenu, { once: true });

  requestAnimationFrame(() => {
    document.addEventListener("pointerdown", closeCompactArtContextMenuOnOutsidePointer, {
      capture: true,
      signal: controller.signal
    });
    document.addEventListener("contextmenu", closeCompactArtContextMenuOnOutsidePointer, {
      capture: true,
      signal: controller.signal
    });
  });

  document.addEventListener("keydown", closeCompactArtContextMenuOnEscape, { signal: controller.signal });
  window.addEventListener("resize", closeCompactArtContextMenu, { signal: controller.signal });
  document.addEventListener("scroll", closeCompactArtContextMenu, {
    capture: true,
    signal: controller.signal
  });
  menu.focus({ preventScroll: true });
}

function getCompactArtContextMenuTarget(element, event) {
  if (!(event.target instanceof Element)) return null;
  if (event.target.closest(ART_CONTEXT_MENU_EXCLUDE_SELECTOR)) return null;

  for (const art of element.querySelectorAll(ART_CONTEXT_MENU_SELECTOR)) {
    if (!(art instanceof HTMLElement)) continue;
    if (!isPointInsideElement(event.clientX, event.clientY, art)) continue;
    return art;
  }

  return null;
}

function buildCompactArtContextMenuActions(sheet, art) {
  const actions = [];
  const editAttribute = art.dataset.dhcaEdit ?? "img";

  if (isCompactSheetEditable(sheet)) {
    actions.push({
      attr: editAttribute,
      icon: "fa-solid fa-image",
      label: localizeCompactFallback("DHCS.ContextMenu.ChangeImage", "Change Image"),
      onSelect: (event) => openCompactImagePicker(sheet, event)
    });
  }

  actions.push({
    icon: "fa-solid fa-wrench",
    label: localizeCompactFallback("DHCS.ContextMenu.OpenSheetSettings", "Open Sheet Settings"),
    onSelect: () => openCompactSheetSettings(sheet)
  });

  return actions;
}

function createCompactArtContextMenuItem(action) {
  const button = document.createElement("button");
  button.type = "button";
  button.className = ART_CONTEXT_MENU_ITEM_CLASS;
  button.setAttribute("role", "menuitem");
  if (action.attr) button.dataset.dhcaEdit = action.attr;

  const icon = document.createElement("i");
  icon.className = action.icon;
  icon.setAttribute("aria-hidden", "true");

  const label = document.createElement("span");
  label.textContent = action.label;

  button.append(icon, label);
  button.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    closeCompactArtContextMenu();
    action.onSelect(event);
  });

  return button;
}

function openCompactSheetSettings(sheet) {
  const settingsButton = sheet.element?.querySelector(ART_CONTEXT_MENU_SETTINGS_SELECTOR);
  if (!(settingsButton instanceof HTMLElement)) return;

  settingsButton.click();
}

function closeCompactArtContextMenu() {
  const cleanup = activeCompactArtContextMenuCleanup;
  activeCompactArtContextMenuCleanup = null;
  cleanup?.();
}

function closeCompactArtContextMenuOnOutsidePointer(event) {
  if (event.target instanceof Element && event.target.closest(`.${ART_CONTEXT_MENU_CLASS}`)) return;
  closeCompactArtContextMenu();
}

function closeCompactArtContextMenuOnEscape(event) {
  if (event.key !== "Escape") return;

  event.preventDefault();
  closeCompactArtContextMenu();
}

function positionCompactArtContextMenu(menu, clientX, clientY) {
  const margin = 8;
  const rect = menu.getBoundingClientRect();
  const left = Math.min(clientX, window.innerWidth - rect.width - margin);
  const top = Math.min(clientY, window.innerHeight - rect.height - margin);

  menu.style.left = `${Math.max(margin, left)}px`;
  menu.style.top = `${Math.max(margin, top)}px`;
}

function isPointInsideElement(clientX, clientY, element) {
  const rect = element.getBoundingClientRect();
  return clientX >= rect.left
    && clientX <= rect.right
    && clientY >= rect.top
    && clientY <= rect.bottom;
}

function syncCompactArtContextMenuTheme(menu, element) {
  if (!element) return;

  const styles = getComputedStyle(element);

  for (const [menuVariable, sheetVariable] of ART_CONTEXT_MENU_THEME_VARS) {
    const value = styles.getPropertyValue(sheetVariable).trim();
    if (value) menu.style.setProperty(menuVariable, value);
  }
}

function localizeCompactFallback(key, fallback) {
  const localized = game.i18n.localize(key);
  return localized === key ? fallback : localized;
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

function parseCssPixelValue(value) {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function getCompactResourceStepValue(document, resourceKey) {
  const resource = getCompactResource(document, resourceKey);
  if (!resource) return null;

  const value = Number(resource.value ?? 0);
  const max = Math.max(Number(resource.max ?? value), 0);

  if (!Number.isFinite(value) || !Number.isFinite(max)) return null;

  return {
    max,
    value: clampNumber(value, 0, max)
  };
}

function getCompactResource(document, resourceKey) {
  return resourceKey === "armor"
    ? document.system?.armorScore
    : document.system?.resources?.[resourceKey];
}

async function updateCompactResourceStepValue(document, resourceKey, nextValue, currentValue) {
  if (resourceKey === "armor") {
    if (typeof document.system?.updateArmorValue !== "function") return;

    await document.system.updateArmorValue({ value: nextValue - currentValue });
    return;
  }

  await document.update({ [`system.resources.${resourceKey}.value`]: nextValue });
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
