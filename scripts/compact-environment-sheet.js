import {
  DEFAULT_WINDOWS,
  ENVIRONMENT_TEMPLATE_PARTIALS,
  MODULE_ID,
  SETTING_KEYS
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
import { buildCompactEnvironmentContext } from "./utils.js";

const TAB_NAV_ENTRIES = Object.freeze([
  { id: "features", icon: "fa-solid fa-list" },
  { id: "potentialAdversaries", icon: "fa-solid fa-user-group" },
  { id: "notes", icon: "fa-solid fa-note-sticky" }
]);

export function createCompactEnvironmentSheetClass(BaseEnvironmentSheet) {
  return class CompactEnvironmentSheet extends BaseEnvironmentSheet {
    #renderController = null;
    #resourceTrackResizeObserver = null;

    static DEFAULT_OPTIONS = createCompactDefaultOptions(BaseEnvironmentSheet, DEFAULT_WINDOWS.environment);

    static PARTS = createCompactParts(BaseEnvironmentSheet, {
      art: createTemplatePart(ENVIRONMENT_TEMPLATE_PARTIALS.art),
      header: createTemplatePart(ENVIRONMENT_TEMPLATE_PARTIALS.header),
      sidebar: { ...createTemplatePart(ENVIRONMENT_TEMPLATE_PARTIALS.footer), scrollable: [] },
      features: createTemplatePart(ENVIRONMENT_TEMPLATE_PARTIALS.features, { scrollable: true }),
      potentialAdversaries: createTemplatePart(ENVIRONMENT_TEMPLATE_PARTIALS.potentialAdversaries, { scrollable: true }),
      notes: createTemplatePart(ENVIRONMENT_TEMPLATE_PARTIALS.notes, { scrollable: true })
    });

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const compactEnvironment = await buildCompactEnvironmentContext(this.document);
      context.compact = {
        ...compactEnvironment,
        showInteractionButtons: game.settings.get(MODULE_ID, SETTING_KEYS.showAdversaryInteractionButtons),
        tabNav: buildTabNavContext(context.tabs, TAB_NAV_ENTRIES),
        useResourcePips: true
      };
      return context;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      this.#renderController = refreshRenderController(this.#renderController);
      this.element?.classList.toggle("dhca-show-interactions", context.compact?.showInteractionButtons === true);
      expandFeatureDescriptions(this.element);
      inlineFeatureDescriptions(this.element, this.#renderController.signal);
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
