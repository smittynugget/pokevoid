import BattleScene from "../battle-scene";
import { PersistentModifier } from "../modifier/modifier";
import {
  GeneratedPersistentModifierType,
  ModifierType,
  ModifierTypeGenerator,
  PermaPartyAbilityModifierTypeGenerator,
  getModifierTypeFuncById,
  smittyFormQuestModifiers, rivalQuestModifiers, QuestModifierType,
  GeneratorInstanceCheck
} from "../modifier/modifier-type";
import { processMoveUpgradeModifierArgsForSerialization, processMoveUpgradeModifierArgsForDeserialization } from "../modifier/move-upgrade-serialization";
import { MoveUpgradeModifier } from "../modifier/modifier";

export default class ModifierData {
  private player: boolean;
  private typeId: string;
  private typePregenArgs: any[];
  private args: any[];
  private stackCount: integer;
  private consoleCode?: string;
  private skillTreeTooltip?: any;
  private skillTreeBounty?: boolean;

  public className: string;

  constructor(source: PersistentModifier | any, player: boolean) {
    const sourceModifier = source instanceof PersistentModifier ? source as PersistentModifier : null;
    this.player = player;
    this.typeId = sourceModifier ? sourceModifier.type.id : source.typeId;

    if (sourceModifier && 'consoleCode' in sourceModifier) {
      this.consoleCode = (sourceModifier as any).consoleCode;
    } else if (source.consoleCode) {
      this.consoleCode = source.consoleCode;
    }

    if (sourceModifier && 'skillTreeTooltip' in sourceModifier) {
      this.skillTreeTooltip = (sourceModifier as any).skillTreeTooltip;
    } else if (source.skillTreeTooltip) {
      this.skillTreeTooltip = source.skillTreeTooltip;
    }

    if (sourceModifier && 'skillTreeBounty' in sourceModifier) {
      this.skillTreeBounty = (sourceModifier as any).skillTreeBounty;
    } else if (source.skillTreeBounty) {
      this.skillTreeBounty = source.skillTreeBounty;
    }

    if (sourceModifier) {
      if ("getPregenArgs" in source.type) {
        this.typePregenArgs = (source.type as GeneratedPersistentModifierType).getPregenArgs();
      }
    } else if (source.typePregenArgs) {
      this.typePregenArgs = source.typePregenArgs;
    }
    this.args = sourceModifier ? sourceModifier.getArgs() : source.args || [];
    this.stackCount = source.stackCount;
    this.className = sourceModifier ? sourceModifier.constructor.name : source.className;

    if (source instanceof MoveUpgradeModifier ||
        (source && source.className === 'MoveUpgradeModifier')) {
      this.args = processMoveUpgradeModifierArgsForSerialization(this.args);

      if (Array.isArray(this.args)) {
        this.args = this.args.map(arg => {
          if (Array.isArray(arg)) {
            return arg.map(item => {
              if (item && item.className === 'Object' && item.properties) {
                return item.properties;
              }
              return item;
            });
          } else if (arg && arg.className === 'Object' && arg.properties) {
            return arg.properties;
          }
          return arg;
        });
      }
    }
  }

  toModifier(scene: BattleScene, constructor: any): PersistentModifier | null {
    if (this.className === 'MoveUpgradeModifier') {
      if (Array.isArray(this.args)) {
        this.args = this.args.map((arg, i) => {
          if (Array.isArray(arg)) {
            return arg.map(item => {

              if (item && item.className === 'Object' && item.properties) {
                return item.properties;
              }

              return item;
            });
          }
           else if (arg && arg.className === 'Object' && arg.properties) {
            return arg.properties;
          }

          return arg;
        });
      }

      this.args = processMoveUpgradeModifierArgsForDeserialization(this.args);
    }

    if (this.consoleCode) {
      const rivalQuest = rivalQuestModifiers[this.consoleCode];
      const smittyQuest = smittyFormQuestModifiers[this.consoleCode];

      if (rivalQuest || smittyQuest) {
        const questModifier = (rivalQuest || smittyQuest).generateType([], this.typePregenArgs);
        if (questModifier) {
          const condition = questModifier.getCondition();
          const args = [...this.args];
          args[2] = condition;

          const modifier = questModifier.newModifier(...args) as PersistentModifier;
          if (modifier) {
            (modifier as any).consoleCode = this.consoleCode;
            if (this.skillTreeBounty) {
              (modifier as any).skillTreeBounty = this.skillTreeBounty;
            }
            modifier.stackCount = this.stackCount;
            return modifier;
          }
        }
      }
    }

    const typeFunc = getModifierTypeFuncById(this.typeId);

    if (!typeFunc) {
      return null;
    }

    try {
      let type: ModifierType | null = typeFunc();
      type.id = this.typeId;

      if (this.className === 'PermaPartyAbilityModifier' && this.typePregenArgs && this.typePregenArgs.length >= 1 && this.args.length >= 3) {
        const raw = this.typePregenArgs[0];
        const abilityID = typeof raw === "number" ? raw : raw?.id;
        if (type.constructor.name === 'PermaPartyAbilityModifierTypeGenerator' && abilityID != null && abilityID >= 0) {
          this.args[2] = abilityID;
        }
      }

      if (type instanceof ModifierTypeGenerator) {
        if (type instanceof PermaPartyAbilityModifierTypeGenerator) {
          type.assignScene(scene);
        }
        if(this.typePregenArgs) {
          type = (type as ModifierTypeGenerator).generateType(
                this.player ? scene.getParty() : scene.getEnemyField(),
                this.typePregenArgs
            );
          }
          else if(this.args && this.args.length > 1) {
            type = (type as ModifierTypeGenerator).generateType(
                  this.player ? scene.getParty() : scene.getEnemyField(),
                  GeneratorInstanceCheck(type) ? this.args.slice(1) : this.args
              );
          }
        if (type instanceof QuestModifierType) {
            const condition = type.getCondition();
            const args = [...this.args];
        args[2] = condition;
            this.args = args;
        }
      }

      if (type instanceof QuestModifierType) {
        const questModifier = type.newModifier(...this.args) as PersistentModifier;
        if (questModifier) {
          if (this.consoleCode) {
            (questModifier as any).consoleCode = this.consoleCode;
          }
          if (this.skillTreeBounty) {
            (questModifier as any).skillTreeBounty = this.skillTreeBounty;
          }
          questModifier.stackCount = this.stackCount;
          if (this.skillTreeTooltip) {
            (questModifier as any).skillTreeTooltip = this.skillTreeTooltip;
          }
          return questModifier;
        }
      }

      const ret = Reflect.construct(constructor, ([type] as any[]).concat(this.args).concat(this.stackCount)) as PersistentModifier;

      if (ret.stackCount > ret.getMaxStackCount(scene)) {
        ret.stackCount = ret.getMaxStackCount(scene);
      }

      if (this.skillTreeTooltip) {
        (ret as any).skillTreeTooltip = this.skillTreeTooltip;
      }
      if (this.skillTreeBounty) {
        (ret as any).skillTreeBounty = this.skillTreeBounty;
      }

      return ret;
    } catch (err) {
      console.error(err);
      return null;
    }
  }
}