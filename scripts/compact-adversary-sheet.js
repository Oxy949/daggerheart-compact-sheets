const MODULE_ID = "daggerheart-compact-adversary-sheet";

export function createCompactAdversarySheetClass(BaseAdversarySheet) {
  return class CompactAdversarySheet extends BaseAdversarySheet {
    static DEFAULT_OPTIONS = foundry.utils.mergeObject(
      foundry.utils.deepClone(BaseAdversarySheet.DEFAULT_OPTIONS),
      {
        classes: [...(BaseAdversarySheet.DEFAULT_OPTIONS.classes ?? []), "dh-compact-adversary"],
        position: {
          width: 350,
          height: 780
        }
      },
      { inplace: false }
    );

    static PARTS = foundry.utils.mergeObject(
      foundry.utils.deepClone(BaseAdversarySheet.PARTS),
      {
        header: {
          template: `modules/${MODULE_ID}/templates/parts/header.hbs`
        },
        sidebar: {
          template: `modules/${MODULE_ID}/templates/parts/footer.hbs`
        },
        features: {
          template: `modules/${MODULE_ID}/templates/parts/features.hbs`,
          scrollable: [".compact-tab-scroll"]
        },
        effects: {
          template: `modules/${MODULE_ID}/templates/parts/effects.hbs`,
          scrollable: [".compact-tab-scroll"]
        },
        notes: {
          template: `modules/${MODULE_ID}/templates/parts/notes.hbs`,
          scrollable: [".compact-tab-scroll"]
        }
      },
      { inplace: false }
    );

    async _prepareContext(options) {
      const context = await super._prepareContext(options);

      const hitPoints = this.document.system.resources?.hitPoints ?? { value: 0, max: 0 };
      const stress = this.document.system.resources?.stress ?? { value: 0, max: 0 };
      const makeSlots = (resource) => {
        const value = Number(resource.value ?? 0);
        const max = Number(resource.max ?? 0);
        return Array.from({ length: Math.max(max, 0) }, (_, index) => ({
          value: index + 1,
          filled: value >= index + 1
        }));
      };
      const groupSlots = (slots, size = 3) => {
        const groups = [];
        for (let index = 0; index < slots.length; index += size) {
          groups.push(slots.slice(index, index + size));
        }
        return groups;
      };
      const hitPointSlots = makeSlots(hitPoints);
      const stressSlots = makeSlots(stress);

      context.compact = {
        thresholdMajor: this.document.system.damageThresholds?.major ?? 0,
        thresholdSevere: this.document.system.damageThresholds?.severe ?? 0,
        hitPoints,
        stress,
        hitPointSlots,
        stressSlots,
        hitPointSlotGroups: groupSlots(hitPointSlots),
        stressSlotGroups: groupSlots(stressSlots),
        attackBonus: this.document.system.attack?.roll?.bonus,
        criticalThreshold: this.document.system.criticalThreshold,
        hasExperiences: !foundry.utils.isEmpty(this.document.system.experiences)
      };
      context.useResourcePips = true;

      return context;
    }

    async _onRender(context, options) {
      await super._onRender(context, options);
      this.#expandCompactDescriptions();
      this.#activateCompactResourceSteps();
    }

    #expandCompactDescriptions() {
      for (const element of this.element.querySelectorAll(".tab.features .inventory-item .extensible")) {
        element.classList.add("extended");
      }
    }

    #activateCompactResourceSteps() {
      for (const button of this.element.querySelectorAll("[data-compact-resource-step]")) {
        button.addEventListener("click", this.#onCompactResourceStep);
      }
    }

    #onCompactResourceStep = async (event) => {
      event.preventDefault();
      event.stopPropagation();
      const button = event.currentTarget;
      const resourceKey = button.dataset.compactResourceStep;
      const direction = Number(button.dataset.direction ?? 0);
      const resource = this.document.system.resources?.[resourceKey];
      if (!resource || !direction) return;

      const current = Number(resource.value ?? 0);
      const max = Number(resource.max ?? current);
      const value = Math.min(Math.max(current + direction, 0), max);
      await this.document.update({ [`system.resources.${resourceKey}.value`]: value });
    };
  };
}
