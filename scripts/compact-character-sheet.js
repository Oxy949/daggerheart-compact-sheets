import {
  CHARACTER_TEMPLATE_PARTIALS,
  DEFAULT_WINDOWS,
  RESOURCE_ROW_SELECTOR,
  RESOURCE_STEP_SELECTOR
} from "./constants.js";
import {
  bindCompactImageEditButtons,
  buildTabNavContext,
  closeRenderController,
  createCompactDefaultOptions,
  createCompactParts,
  createTemplatePart,
  expandFeatureDescriptions,
  isCompactSheetEditable,
  openCompactImagePicker,
  refreshRenderController
} from "./compact-sheet-helpers.js";
import { buildCompactCharacterContext, clampNumber } from "./utils.js";

const TAB_NAV_ENTRIES = Object.freeze([
  { id: "features", icon: "fa-solid fa-star" },
  { id: "loadout", icon: "fa-solid fa-layer-group" },
  { id: "inventory", icon: "fa-solid fa-bag-shopping" },
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
      sidebar: createTemplatePart(CHARACTER_TEMPLATE_PARTIALS.footer),
      features: createTemplatePart(CHARACTER_TEMPLATE_PARTIALS.features, { scrollable: true }),
      loadout: createTemplatePart(CHARACTER_TEMPLATE_PARTIALS.loadout, { scrollable: true }),
      inventory: createTemplatePart(CHARACTER_TEMPLATE_PARTIALS.inventory, { scrollable: true }),
      biography: createTemplatePart(CHARACTER_TEMPLATE_PARTIALS.biography, { scrollable: true }),
      effects: createTemplatePart(CHARACTER_TEMPLATE_PARTIALS.effects, { scrollable: true })
    });

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.compact = {
        ...buildCompactCharacterContext(this.document, context.attributes),
        tabNav: buildTabNavContext(context.tabs, TAB_NAV_ENTRIES),
        useResourcePips: true
      };
      return context;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      this.#renderController = refreshRenderController(this.#renderController);
      expandFeatureDescriptions(this.element);
      this.#bindResourceStepButtons();
      bindCompactImageEditButtons(this.element, this.#renderController.signal, this.#onCompactImageEdit);
      this.#bindResponsiveResourceTracks();
    }

    async close(options = {}) {
      this.#renderController = closeRenderController(this.#renderController);
      this.#resourceTrackResizeObserver?.disconnect();
      this.#resourceTrackResizeObserver = null;
      return super.close(options);
    }

    #bindResourceStepButtons() {
      if (!this.element || !this.#renderController) return;

      const { signal } = this.#renderController;

      for (const button of this.element.querySelectorAll(RESOURCE_STEP_SELECTOR)) {
        button.addEventListener("click", this.#onCompactResourceStep, { signal });
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
      return isCompactSheetEditable(this);
    }

    #onCompactResourceStep = async (event) => {
      event.preventDefault();
      event.stopPropagation();

      if (!this.#isSheetEditable()) return;

      const button = event.currentTarget;
      const resourceKey = button.dataset.dhcaResourceStep;
      const direction = Number(button.dataset.direction ?? 0);

      if (!resourceKey || !Number.isFinite(direction) || direction === 0) return;

      const resource = resourceKey === "armorScore"
        ? this.document.system.armorScore
        : this.document.system.resources?.[resourceKey];

      if (!resource) return;

      const current = Number(resource.value ?? 0);
      const max = Math.max(Number(resource.max ?? current), 0);
      const nextValue = clampNumber(current + direction, 0, max);

      if (nextValue === current) return;

      button.disabled = true;

      try {
        if (resourceKey === "armorScore" && typeof this.document.system.updateArmorValue === "function") {
          await this.document.system.updateArmorValue({ value: nextValue - current });
        } else if (resourceKey === "armorScore") {
          await this.document.update({ "system.armorScore.value": nextValue });
        } else {
          await this.document.update({ [`system.resources.${resourceKey}.value`]: nextValue });
        }
      } finally {
        button.disabled = !this.#isSheetEditable();
      }
    };

    #onCompactImageEdit = (event) => openCompactImagePicker(this, event);
  };
}
