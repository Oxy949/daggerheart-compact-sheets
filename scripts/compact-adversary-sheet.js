import {
  ADVERSARY_TEMPLATE_PARTIALS,
  DEFAULT_WINDOWS,
  FEATURE_DESCRIPTION_SELECTOR,
  RESOURCE_STEP_SELECTOR
} from "./constants.js";
import { buildCompactContext, clampNumber } from "./utils.js";

const ART_EDIT_SELECTOR = ".dhca-header__art-edit";
const RESOURCE_ROW_SELECTOR = ".dhca-resource-row:not(.dhca-resource-row--fallback)";

export function createCompactAdversarySheetClass(BaseAdversarySheet) {
  return class CompactAdversarySheet extends BaseAdversarySheet {
    #renderController = null;
    #resourceTrackResizeObserver = null;

    static DEFAULT_OPTIONS = foundry.utils.mergeObject(
      foundry.utils.deepClone(BaseAdversarySheet.DEFAULT_OPTIONS),
      {
        classes: [...new Set([...(BaseAdversarySheet.DEFAULT_OPTIONS.classes ?? []), "dh-compact"])],
        position: {
          ...(BaseAdversarySheet.DEFAULT_OPTIONS.position ?? {}),
          ...DEFAULT_WINDOWS.adversary
        }
      },
      { inplace: false }
    );

    static PARTS = foundry.utils.mergeObject(
      foundry.utils.deepClone(BaseAdversarySheet.PARTS),
      {
        art: {
          template: ADVERSARY_TEMPLATE_PARTIALS.art
        },
        header: {
          template: ADVERSARY_TEMPLATE_PARTIALS.header
        },
        sidebar: {
          template: ADVERSARY_TEMPLATE_PARTIALS.footer
        },
        features: {
          template: ADVERSARY_TEMPLATE_PARTIALS.features,
          scrollable: [".dhca-tab-panel__scroll"]
        },
        effects: {
          template: ADVERSARY_TEMPLATE_PARTIALS.effects,
          scrollable: [".dhca-tab-panel__scroll"]
        },
        notes: {
          template: ADVERSARY_TEMPLATE_PARTIALS.notes,
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
      this.#bindResponsiveResourceTracks();
    }

    async close(options = {}) {
      this.#renderController?.abort();
      this.#renderController = null;
      this.#resourceTrackResizeObserver?.disconnect();
      this.#resourceTrackResizeObserver = null;
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
