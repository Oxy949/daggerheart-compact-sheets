import {
  DEFAULT_WINDOWS,
  ENVIRONMENT_TEMPLATE_PARTIALS,
  MODULE_ID,
  SETTING_KEYS
} from "./constants.js";
import {
  bindCompactSheetChrome,
  buildTabNavContext,
  closeCompactRenderState,
  createCompactDefaultOptions,
  createCompactParts,
  createTemplatePart,
  normalizeCompactFeatureRows,
  prepareCompactRender
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
        tabNav: buildTabNavContext(context.tabs, TAB_NAV_ENTRIES)
      };
      return context;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      this.#renderController = prepareCompactRender(this, this.#renderController, context);
      normalizeCompactFeatureRows(this.element, this.#renderController.signal);
      bindCompactSheetChrome(this, this.#renderController.signal);
    }

    async close(options = {}) {
      const renderState = closeCompactRenderState(this.#renderController);
      this.#renderController = renderState.renderController;
      return super.close(options);
    }
  };
}
