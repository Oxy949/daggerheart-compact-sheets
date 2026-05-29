import {
  CHARACTER_TEMPLATE_PARTIALS,
  DEFAULT_WINDOWS,
  RESOURCE_ROW_SELECTOR,
  RESOURCE_STEP_SELECTOR,
  RESOURCE_TRACK_MIN_SCALE,
  RESOURCE_TRACK_SHRINK_START_RATIO
} from "./constants.js";
import {
  bindCompactImageEditButtons,
  bindCompactWindowTitleGapDrag,
  buildTabNavContext,
  closeRenderController,
  createCompactDefaultOptions,
  createCompactParts,
  createTemplatePart,
  expandFeatureDescriptions,
  inlineFeatureDescriptions,
  isCompactSheetEditable,
  measureCompactTrackContentWidth,
  openCompactImagePicker,
  refreshRenderController
} from "./compact-sheet-helpers.js";
import { buildCompactCharacterContext, clampNumber } from "./utils.js";

const TAB_NAV_ENTRIES = Object.freeze([
  { id: "features", icon: "fa-solid fa-list" },
  { id: "loadout", icon: "fa-solid fa-diamond" },
  { id: "inventory", icon: "fa-solid fa-suitcase" },
  { id: "biography", icon: "fa-solid fa-book-open" },
  { id: "effects", icon: "fa-solid fa-bolt" }
]);

export function createCompactCharacterSheetClass(BaseCharacterSheet) {
  return class CompactCharacterSheet extends BaseCharacterSheet {
    #renderController = null;
    #resourceTrackResizeObserver = null;

    static DEFAULT_OPTIONS = createCompactDefaultOptions(BaseCharacterSheet, DEFAULT_WINDOWS.character);

    static PARTS = createCompactParts(BaseCharacterSheet, {
      art: createTemplatePart(CHARACTER_TEMPLATE_PARTIALS.art),
      header: createTemplatePart(CHARACTER_TEMPLATE_PARTIALS.header),
      sidebar: { ...createTemplatePart(CHARACTER_TEMPLATE_PARTIALS.footer), scrollable: [] },
      features: createTemplatePart(CHARACTER_TEMPLATE_PARTIALS.features, { scrollable: true }),
      loadout: createTemplatePart(CHARACTER_TEMPLATE_PARTIALS.loadout, { scrollable: true }),
      inventory: createTemplatePart(CHARACTER_TEMPLATE_PARTIALS.inventory, { scrollable: true }),
      biography: createTemplatePart(CHARACTER_TEMPLATE_PARTIALS.biography, { scrollable: true }),
      effects: createTemplatePart(CHARACTER_TEMPLATE_PARTIALS.effects, { scrollable: true })
    });

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.compact = {
        ...buildCompactCharacterContext(this.document),
        showInteractionButtons: true,
        tabNav: buildTabNavContext(context.tabs, TAB_NAV_ENTRIES),
        useResourcePips: true
      };
      return context;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      this.#renderController = refreshRenderController(this.#renderController);
      expandFeatureDescriptions(this.element);
      inlineFeatureDescriptions(this.element, this.#renderController.signal);
      normalizeCompactItemSeparators(this.element);
      this.#bindResourceStepButtons();
      bindCompactImageEditButtons(this.element, this.#renderController.signal, this.#onCompactImageEdit);
      bindCompactWindowTitleGapDrag(this, this.element, this.#renderController.signal);
      this.#bindResponsiveResourceTracks();
    }

    async close(options = {}) {
      this.#renderController = closeRenderController(this.#renderController);
      this.#resourceTrackResizeObserver?.disconnect();
      this.#resourceTrackResizeObserver = null;
      return super.close(options);
    }

    #bindResponsiveResourceTracks() {
      if (!this.element) return;

      this.#resourceTrackResizeObserver?.disconnect();

      const updateSizing = () => this.#updateResponsiveResourceTracks();
      this.#resourceTrackResizeObserver = new ResizeObserver(() => updateSizing());

      for (const row of this.element.querySelectorAll(RESOURCE_ROW_SELECTOR)) {
        this.#resourceTrackResizeObserver.observe(row);
      }

      requestAnimationFrame(() => updateSizing());
    }

    #bindResourceStepButtons() {
      if (!this.element || !this.#renderController) return;

      const { signal } = this.#renderController;

      for (const button of this.element.querySelectorAll(RESOURCE_STEP_SELECTOR)) {
        button.addEventListener("click", this.#onCompactResourceStep, { signal });
      }
    }

    #updateResponsiveResourceTracks() {
      if (!this.element) return;

      for (const row of this.element.querySelectorAll(RESOURCE_ROW_SELECTOR)) {
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

    #isSheetEditable() {
      return isCompactSheetEditable(this);
    }

    #onCompactImageEdit = (event) => openCompactImagePicker(this, event);

    #onCompactResourceStep = async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!this.#isSheetEditable()) return;

      const button = event.currentTarget;
      const resourceKey = button.dataset.dhcaResourceStep;
      const direction = Number(button.dataset.direction ?? 0);

      if (!resourceKey || !Number.isFinite(direction) || direction === 0) return;

      const current = this.#getResourceStepValue(resourceKey);
      if (!current) return;

      const nextValue = clampNumber(current.value + direction, 0, current.max);
      if (nextValue === current.value) return;

      button.disabled = true;

      try {
        if (resourceKey === "armor") {
          await this.document.system.updateArmorValue({ value: nextValue - current.value });
        } else {
          await this.document.update({ [`system.resources.${resourceKey}.value`]: nextValue });
        }
      } finally {
        button.disabled = !this.#isSheetEditable();
      }
    };

    #getResourceStepValue(resourceKey) {
      const resource = resourceKey === "armor"
        ? this.document.system.armorScore
        : this.document.system.resources?.[resourceKey];

      if (!resource) return null;

      const value = Number(resource.value ?? 0);
      const max = Math.max(Number(resource.max ?? value), 0);

      if (!Number.isFinite(value) || !Number.isFinite(max)) return null;

      return {
        max,
        value: clampNumber(value, 0, max)
      };
    }
  };
}

function normalizeCompactItemSeparators(element) {
  if (!element) return;

  for (const separator of element.querySelectorAll(".dhca-character-quick-list .label > span, .dhca-tab-panel .label > span")) {
    if (separator.textContent.trim() !== "-") continue;
    separator.textContent = "|";
  }
}
