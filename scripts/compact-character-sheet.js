import {
  CHARACTER_TEMPLATE_PARTIALS,
  DEFAULT_WINDOWS
} from "./constants.js";
import {
  bindCompactArtContextMenu,
  bindCompactResourceStepButtons,
  bindResponsiveResourceTracks,
  bindCompactWindowTitleGapDrag,
  buildTabNavContext,
  closeRenderController,
  createCompactDefaultOptions,
  createCompactParts,
  createTemplatePart,
  expandFeatureDescriptions,
  handleCompactResourceStep,
  inlineFeatureDescriptions,
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
      bindCompactResourceStepButtons(this.element, this.#renderController.signal, this.#onCompactResourceStep);
      bindCompactArtContextMenu(this, this.element, this.#renderController.signal);
      bindCompactWindowTitleGapDrag(this, this.element, this.#renderController.signal);
      this.#resourceTrackResizeObserver = bindResponsiveResourceTracks(this.element, this.#resourceTrackResizeObserver);
    }

    async close(options = {}) {
      this.#renderController = closeRenderController(this.#renderController);
      this.#resourceTrackResizeObserver?.disconnect();
      this.#resourceTrackResizeObserver = null;
      return super.close(options);
    }
    #onCompactResourceStep = (event) => handleCompactResourceStep(this, event);
  };
}

function normalizeCompactItemSeparators(element) {
  if (!element) return;

  for (const separator of element.querySelectorAll(".dhca-character-quick-list .label > span, .dhca-tab-panel .label > span")) {
    if (separator.textContent.trim() !== "-") continue;
    separator.textContent = "|";
  }
}
