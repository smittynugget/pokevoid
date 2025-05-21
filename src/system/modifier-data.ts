import BattleScene from "../battle-scene";
import { PersistentModifier } from "../modifier/modifier";
import {
  GeneratedPersistentModifierType,
  ModifierType,
  ModifierTypeGenerator,
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
        const abilityID = this.typePregenArgs[0].id; 
        if (type.constructor.name === 'PermaPartyAbilityModifierTypeGenerator' && abilityID) {
          this.args[2] = abilityID; 
        }
      }

      if (type instanceof ModifierTypeGenerator) {
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

      const ret = Reflect.construct(constructor, ([type] as any[]).concat(this.args).concat(this.stackCount)) as PersistentModifier;

      if (ret.stackCount > ret.getMaxStackCount(scene)) {
        ret.stackCount = ret.getMaxStackCount(scene);
      }

      return ret;
    } catch (err) {
      console.error(err);
      return null;
    }
  }
}
