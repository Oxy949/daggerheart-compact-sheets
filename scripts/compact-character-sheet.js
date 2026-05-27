import {
  CHARACTER_TEMPLATE_PARTIALS,
  DEFAULT_WINDOWS,
  RESOURCE_ROW_SELECTOR
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
  openCompactImagePicker,
  refreshRenderController
} from "./compact-sheet-helpers.js";
import { buildCompactCharacterContext } from "./utils.js";

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

    #updateResponsiveResourceTracks() {
      if (!this.element) return;

      for (const row of this.element.querySelectorAll(RESOURCE_ROW_SELECTOR)) {
        const track = row.querySelector(".dhca-resource-row__track");
        if (!track) continue;

        row.style.setProperty("--dhca-resource-scale", "1");

        const availableWidth = track.clientWidth;
        const contentWidth = track.scrollWidth;

        if (!availableWidth || !contentWidth || contentWidth <= availableWidth) continue;

        const scale = Math.max(Math.min(availableWidth / contentWidth, 1), 0.6);
        row.style.setProperty("--dhca-resource-scale", scale.toFixed(3));
      }
    }

    #onCompactImageEdit = (event) => openCompactImagePicker(this, event);
  };
}

function normalizeCompactItemSeparators(element) {
  if (!element) return;

  for (const separator of element.querySelectorAll(".dhca-character-quick-list .label > span, .dhca-tab-panel .label > span")) {
    if (separator.textContent.trim() !== "-") continue;
    separator.textContent = "|";
  }
}
