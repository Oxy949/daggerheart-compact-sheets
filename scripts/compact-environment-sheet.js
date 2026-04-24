import {
  DEFAULT_WINDOWS,
  ENVIRONMENT_TEMPLATE_PARTIALS,
  FEATURE_DESCRIPTION_SELECTOR
} from "./constants.js";
import { buildCompactEnvironmentContext } from "./utils.js";

const ART_EDIT_SELECTOR = ".dhca-header__art-edit";

export function createCompactEnvironmentSheetClass(BaseEnvironmentSheet) {
  return class CompactEnvironmentSheet extends BaseEnvironmentSheet {
    #renderController = null;

    static DEFAULT_OPTIONS = foundry.utils.mergeObject(
      foundry.utils.deepClone(BaseEnvironmentSheet.DEFAULT_OPTIONS),
      {
        classes: [...new Set([...(BaseEnvironmentSheet.DEFAULT_OPTIONS.classes ?? []), "dh-compact"])],
        position: {
          ...(BaseEnvironmentSheet.DEFAULT_OPTIONS.position ?? {}),
          ...DEFAULT_WINDOWS.environment
        }
      },
      { inplace: false }
    );

    static PARTS = foundry.utils.mergeObject(
      foundry.utils.deepClone(BaseEnvironmentSheet.PARTS),
      {
        art: {
          template: ENVIRONMENT_TEMPLATE_PARTIALS.art
        },
        header: {
          template: ENVIRONMENT_TEMPLATE_PARTIALS.header
        },
        features: {
          template: ENVIRONMENT_TEMPLATE_PARTIALS.features,
          scrollable: [".dhca-tab-panel__scroll"]
        },
        potentialAdversaries: {
          template: ENVIRONMENT_TEMPLATE_PARTIALS.potentialAdversaries,
          scrollable: [".dhca-tab-panel__scroll"]
        },
        notes: {
          template: ENVIRONMENT_TEMPLATE_PARTIALS.notes,
          scrollable: [".dhca-tab-panel__scroll"]
        }
      },
      { inplace: false }
    );

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.compact = buildCompactEnvironmentContext(this.document);
      return context;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      this.#refreshRenderBindings();
      this.#expandFeatureDescriptions();
      this.#bindImageEditButton();
    }

    async close(options = {}) {
      this.#renderController?.abort();
      this.#renderController = null;
      return super.close(options);
    }

    #refreshRenderBindings() {
      this.#renderController?.abort();
      this.#renderController = new AbortController();
    }

    #expandFeatureDescriptions() {
      if (!this.element) return;

      for (const element of this.element.querySelectorAll(FEATURE_DESCRIPTION_SELECTOR)) {
        element.classList.add("extended");
      }
    }

    #bindImageEditButton() {
      if (!this.element || !this.#renderController) return;

      const { signal } = this.#renderController;

      for (const button of this.element.querySelectorAll(ART_EDIT_SELECTOR)) {
        button.addEventListener("click", this.#onCompactImageEdit, { signal });
      }
    }

    #isSheetEditable() {
      return this.isEditable ?? this.document.isOwner ?? false;
    }

    #onCompactImageEdit = (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!this.#isSheetEditable()) return;

      const target = event.currentTarget;
      const attr = target.dataset.edit ?? "img";
      const current = foundry.utils.getProperty(this.document, attr);
      const { img } = this.document.constructor.getDefaultArtwork?.(this.document.toObject()) ?? {};

      const picker = new foundry.applications.apps.FilePicker.implementation({
        current,
        type: "image",
        redirectToRoot: img ? [img] : [],
        callback: async (path) => {
          await this.document.update({ [attr]: path });
        },
        top: this.position.top + 40,
        left: this.position.left + 10
      });

      return picker.browse();
    };
  };
}
