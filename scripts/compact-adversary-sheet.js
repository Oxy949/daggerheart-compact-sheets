import {
  DEFAULT_WINDOW,
  FEATURE_DESCRIPTION_SELECTOR,
  RESOURCE_STEP_SELECTOR,
  TEMPLATE_PARTIALS
} from "./constants.js";
import { buildCompactContext, clampNumber } from "./utils.js";

const ART_EDIT_SELECTOR = ".dhca-header__art-edit";

export function createCompactAdversarySheetClass(BaseAdversarySheet) {
  return class CompactAdversarySheet extends BaseAdversarySheet {
    #renderController = null;

    static DEFAULT_OPTIONS = foundry.utils.mergeObject(
      foundry.utils.deepClone(BaseAdversarySheet.DEFAULT_OPTIONS),
      {
        classes: [...new Set([...(BaseAdversarySheet.DEFAULT_OPTIONS.classes ?? []), "dh-compact-adversary"])],
        position: {
          ...(BaseAdversarySheet.DEFAULT_OPTIONS.position ?? {}),
          ...DEFAULT_WINDOW
        }
      },
      { inplace: false }
    );

    static PARTS = foundry.utils.mergeObject(
      foundry.utils.deepClone(BaseAdversarySheet.PARTS),
      {
        header: {
          template: TEMPLATE_PARTIALS.header
        },
        sidebar: {
          template: TEMPLATE_PARTIALS.footer
        },
        features: {
          template: TEMPLATE_PARTIALS.features,
          scrollable: [".dhca-tab-panel__scroll"]
        },
        effects: {
          template: TEMPLATE_PARTIALS.effects,
          scrollable: [".dhca-tab-panel__scroll"]
        },
        notes: {
          template: TEMPLATE_PARTIALS.notes,
          scrollable: [".dhca-tab-panel__scroll"]
        }
      },
      { inplace: false }
    );

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.compact = buildCompactContext(this.document);
      context.useResourcePips = true;
      return context;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      this.#refreshRenderBindings();
      this.#expandFeatureDescriptions();
      this.#bindResourceStepButtons();
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

    #bindResourceStepButtons() {
      if (!this.element || !this.#renderController) return;

      const { signal } = this.#renderController;

      for (const button of this.element.querySelectorAll(RESOURCE_STEP_SELECTOR)) {
        button.addEventListener("click", this.#onCompactResourceStep, { signal });
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

    #onCompactResourceStep = async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!this.#isSheetEditable()) return;

      const button = event.currentTarget;
      const resourceKey = button.dataset.dhcaResourceStep;
      const direction = Number(button.dataset.direction ?? 0);
      const resource = this.document.system.resources?.[resourceKey];

      if (!resourceKey || !Number.isFinite(direction) || direction === 0 || !resource) return;

      const current = Number(resource.value ?? 0);
      const max = Math.max(Number(resource.max ?? current), 0);
      const nextValue = clampNumber(current + direction, 0, max);

      if (nextValue === current) return;

      button.disabled = true;

      try {
        await this.document.update({ [`system.resources.${resourceKey}.value`]: nextValue });
      } finally {
        button.disabled = !this.#isSheetEditable();
      }
    };

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
