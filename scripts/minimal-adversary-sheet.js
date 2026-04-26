import {
  DEFAULT_WINDOWS,
  MINIMAL_ADVERSARY_TEMPLATE_PARTIALS
} from "./constants.js";
import {
  closeRenderController,
  createCompactDefaultOptions,
  createTemplatePart,
  expandFeatureDescriptions,
  inlineFeatureDescriptions,
  refreshRenderController
} from "./compact-sheet-helpers.js";
import { buildCompactContext } from "./utils.js";

export function createMinimalAdversarySheetClass(BaseAdversarySheet) {
  return class MinimalAdversarySheet extends BaseAdversarySheet {
    #renderController = null;

    static DEFAULT_OPTIONS = createMinimalDefaultOptions(BaseAdversarySheet);

    static PARTS = createMinimalParts(BaseAdversarySheet);

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.compact = buildCompactContext(this.document);
      return context;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      this.#renderController = refreshRenderController(this.#renderController);
      expandFeatureDescriptions(this.element);
      inlineFeatureDescriptions(this.element, this.#renderController.signal);
    }

    async close(options = {}) {
      this.#renderController = closeRenderController(this.#renderController);
      return super.close(options);
    }
  };
}

function createMinimalDefaultOptions(BaseAdversarySheet) {
  const options = createCompactDefaultOptions(BaseAdversarySheet, DEFAULT_WINDOWS.minimalAdversary);

  return foundry.utils.mergeObject(
    options,
    {
      classes: [...new Set([...(options.classes ?? []), "dh-minimal-adversary"])]
    },
    { inplace: false }
  );
}

function createMinimalParts(BaseAdversarySheet) {
  const parts = {
    header: createTemplatePart(MINIMAL_ADVERSARY_TEMPLATE_PARTIALS.sheet)
  };

  if (BaseAdversarySheet.PARTS?.limited) {
    parts.limited = foundry.utils.deepClone(BaseAdversarySheet.PARTS.limited);
  }

  return parts;
}
