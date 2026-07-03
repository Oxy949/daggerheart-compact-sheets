import {
  ADVERSARY_TEMPLATE_PARTIALS,
  DEFAULT_WINDOWS,
  MODULE_ID,
  SETTING_KEYS
} from "./constants.js";
import {
  bindCompactResourceStepButtons,
  bindResponsiveResourceTracks,
  bindCompactSheetChrome,
  buildTabNavContext,
  closeCompactRenderState,
  createCompactDefaultOptions,
  createCompactParts,
  createTemplatePart,
  handleCompactResourceStep,
  isCompactSheetEditable,
  normalizeCompactFeatureRows,
  prepareCompactRender
} from "./compact-sheet-helpers.js";
import { buildCompactContext, clampNumber } from "./utils.js";

const TAB_NAV_ENTRIES = Object.freeze([
  { id: "features", icon: "fa-solid fa-list" },
  { id: "effects", icon: "fa-solid fa-bolt" },
  { id: "notes", icon: "fa-solid fa-note-sticky" }
]);

const ATTACK_CHAT_ACTION_SELECTOR = ".dhca-header__attack-list .inventory-item-compact .item-name";
const HEADER_RESOURCE_MAX_SELECTOR = ".dhca-header__resource-max[data-dhca-resource-path]";
const HEADER_RESOURCE_VALUE_SELECTOR = ".dhca-header__resource-current[data-dhca-resource-path]";

export function createCompactAdversarySheetClass(BaseAdversarySheet) {
  return class CompactAdversarySheet extends BaseAdversarySheet {
    #renderController = null;
    #resourceTrackResizeObserver = null;

    static DEFAULT_OPTIONS = createCompactDefaultOptions(BaseAdversarySheet, DEFAULT_WINDOWS.adversary);

    static PARTS = createCompactParts(BaseAdversarySheet, {
      art: createTemplatePart(ADVERSARY_TEMPLATE_PARTIALS.art),
      header: createTemplatePart(ADVERSARY_TEMPLATE_PARTIALS.header),
      sidebar: createTemplatePart(ADVERSARY_TEMPLATE_PARTIALS.footer),
      features: createTemplatePart(ADVERSARY_TEMPLATE_PARTIALS.features, { scrollable: true }),
      effects: createTemplatePart(ADVERSARY_TEMPLATE_PARTIALS.effects, { scrollable: true }),
      notes: createTemplatePart(ADVERSARY_TEMPLATE_PARTIALS.notes, { scrollable: true })
    });

    async _prepareContext(options) {
      const context = await super._prepareContext(options);
      context.compact = {
        ...buildCompactContext(this.document),
        showInteractionButtons: game.settings.get(MODULE_ID, SETTING_KEYS.showAdversaryInteractionButtons),
        showResourceBlock: game.settings.get(MODULE_ID, SETTING_KEYS.showAdversaryResourceBlock),
        tabNav: buildTabNavContext(context.tabs, TAB_NAV_ENTRIES),
        useResourcePips: true
      };
      return context;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      this.#renderController = prepareCompactRender(this, this.#renderController, context);
      setupAttackNameChatAction(
        this.element,
        context.compact?.showInteractionButtons === true,
        this.#renderController.signal
      );
      normalizeCompactFeatureRows(this.element, this.#renderController.signal);
      normalizeAttackSeparators(this.element);
      bindCompactResourceStepButtons(this.element, this.#renderController.signal, this.#onCompactResourceStep);
      this.#bindHeaderResourceEdits();
      bindCompactSheetChrome(this, this.#renderController.signal);
      this.#resourceTrackResizeObserver = bindResponsiveResourceTracks(this.element, this.#resourceTrackResizeObserver);
    }

    async close(options = {}) {
      const renderState = closeCompactRenderState(this.#renderController, this.#resourceTrackResizeObserver);
      this.#renderController = renderState.renderController;
      this.#resourceTrackResizeObserver = renderState.resourceTrackResizeObserver;
      return super.close(options);
    }

    #bindHeaderResourceEdits() {
      if (!this.element || !this.#renderController) return;

      const { signal } = this.#renderController;

      for (const value of this.element.querySelectorAll(HEADER_RESOURCE_VALUE_SELECTOR)) {
        value.addEventListener("focus", this.#onHeaderResourceFocus, { signal });
        value.addEventListener("keydown", this.#onHeaderResourceKeydown, { signal });
        value.addEventListener("blur", this.#onHeaderResourceBlur, { signal });
      }

      for (const maxValue of this.element.querySelectorAll(HEADER_RESOURCE_MAX_SELECTOR)) {
        maxValue.addEventListener("click", this.#onHeaderResourceMaxClick, { signal });
        maxValue.addEventListener("contextmenu", this.#onHeaderResourceMaxContextMenu, { signal });
      }
    }

    #isSheetEditable() {
      return isCompactSheetEditable(this);
    }

    #onCompactResourceStep = (event) => handleCompactResourceStep(this, event);

    #onHeaderResourceFocus = (event) => {
      event.currentTarget.dataset.dhcaOriginalValue = event.currentTarget.textContent.trim();
    };

    #onHeaderResourceKeydown = (event) => {
      if (event.key === "Enter") {
        event.preventDefault();
        event.currentTarget.blur();
        return;
      }

      if (event.key === "Escape") {
        event.preventDefault();
        event.currentTarget.textContent = event.currentTarget.dataset.dhcaOriginalValue ?? "";
        event.currentTarget.blur();
      }
    };

    #onHeaderResourceBlur = async (event) => {
      if (!this.#isSheetEditable()) return;

      const target = event.currentTarget;
      const path = target.dataset.dhcaResourcePath;
      if (!path) return;

      const original = Number(target.dataset.dhcaOriginalValue ?? 0);
      const max = Math.max(Number(target.dataset.dhcaResourceMax ?? 0), 0);
      const nextValue = clampNumber(target.textContent.trim(), 0, max);

      target.textContent = String(nextValue);

      if (nextValue === original) return;

      await this.document.update({ [path]: nextValue });
    };

    #onHeaderResourceMaxClick = (event) => this.#stepHeaderResource(event, 1);

    #onHeaderResourceMaxContextMenu = (event) => this.#stepHeaderResource(event, -1);

    async #stepHeaderResource(event, direction) {
      event.preventDefault();
      event.stopPropagation();

      if (!this.#isSheetEditable()) return;

      const target = event.currentTarget;
      const path = target.dataset.dhcaResourcePath;
      if (!path) return;

      const current = Number(foundry.utils.getProperty(this.document, path) ?? 0);
      const max = Math.max(Number(target.dataset.dhcaResourceMax ?? 0), 0);
      const nextValue = clampNumber(current + direction, 0, max);

      if (nextValue === current) return;

      await this.document.update({ [path]: nextValue });
    }
  };
}

function setupAttackNameChatAction(element, enabled, signal) {
  if (!element) return;

  const attackName = element.querySelector(ATTACK_CHAT_ACTION_SELECTOR);
  if (!attackName) return;

  attackName.classList.toggle("dhca-attack-chat-action", enabled);

  if (!enabled) {
    delete attackName.dataset.action;
    delete attackName.dataset.tooltipText;
    attackName.removeAttribute("role");
    attackName.removeAttribute("tabindex");
    return;
  }

  attackName.dataset.action = "toChat";
  attackName.dataset.tooltipText = game.i18n.localize("DAGGERHEART.UI.Tooltip.sendToChat");
  attackName.setAttribute("role", "button");
  attackName.tabIndex = 0;

  attackName.addEventListener("keydown", onAttackNameChatActionKeydown, { signal });
}

function onAttackNameChatActionKeydown(event) {
  if (event.key !== "Enter" && event.key !== " ") return;

  event.preventDefault();
  event.currentTarget.click();
}

function normalizeAttackSeparators(element) {
  if (!element) return;

  for (const separator of element.querySelectorAll(".dhca-header__attack-list .label > span")) {
    if (separator.textContent.trim() !== "-") continue;
    separator.textContent = "|";
    separator.classList.add("dhca-header__attack-separator");
  }
}
