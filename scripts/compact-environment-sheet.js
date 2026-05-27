import {
  DEFAULT_WINDOWS,
  ENVIRONMENT_TEMPLATE_PARTIALS
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
      features: createTemplatePart(ENVIRONMENT_TEMPLATE_PARTIALS.features, { scrollable: true }),
      potentialAdversaries: createTemplatePart(ENVIRONMENT_TEMPLATE_PARTIALS.potentialAdversaries, { scrollable: true }),
      notes: createTemplatePart(ENVIRONMENT_TEMPLATE_PARTIALS.notes, { scrollable: true })
    });

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      const compactEnvironment = await buildCompactEnvironmentContext(this.document);
      context.compact = {
        ...compactEnvironment,
        tabNav: buildTabNavContext(context.tabs, TAB_NAV_ENTRIES)
      };
      return context;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      this.#renderController = refreshRenderController(this.#renderController);
      expandFeatureDescriptions(this.element);
      inlineFeatureDescriptions(this.element, this.#renderController.signal);
      bindCompactImageEditButtons(this.element, this.#renderController.signal, this.#onCompactImageEdit);
      bindCompactWindowTitleGapDrag(this, this.element, this.#renderController.signal);
    }

    async close(options = {}) {
      this.#renderController = closeRenderController(this.#renderController);
      return super.close(options);
    }

    #onCompactImageEdit = (event) => openCompactImagePicker(this, event);
  };
}
