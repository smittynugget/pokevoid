import { MoveAttr, MoveCondition } from '../data/move';
import { allMoveAttributes, allMoveConditions, moveAttrsAndValues } from '../data/move-registry';

export function serializeMoveAttr(attr: MoveAttr): any {
  if (!attr) return null;
  
  const className = attr.constructor.name;

  if(className === "Object") {
    return attr;
  }
  
  const properties = Object.getOwnPropertyNames(attr)
    .filter(prop => typeof attr[prop] !== 'function')
    .reduce((obj, prop) => {
      obj[prop] = attr[prop];
      return obj;
    }, {} as any);
  
  return {
    className,
    properties
  };
}

export function deserializeMoveAttr(attrData: any): MoveAttr | null {
  if (!attrData || (!attrData.className && !attrData.properties?.className)) return null;
  let className = attrData.className || attrData.properties.className;
  let properties = attrData.properties || attrData.properties.properties;
  
  const AttrClass = allMoveAttributes[className];
  if (!AttrClass) {
    console.warn(`Unknown MoveAttr class: ${className}`);
    return null;
  }
  
  try {
    const instance = new AttrClass();
    
    if (properties) {
      Object.keys(properties).forEach(key => {
        instance[key] = properties[key];
      });
    }
    
    return instance;
  } catch (e) {
    console.error(`Failed to deserialize MoveAttr (${className}):`, e);
    return null;
  }
}

export function serializeMoveCondition(condition: MoveCondition): any {
  if (!condition) return null;
  
  const className = condition.constructor.name;

  if(className === "Object") {
    return condition;
  }
  
  let conditionType = "generic";
  if (className === "LeechSeedCondition") {
    conditionType = "leech_seed";
  } else if (className === "MultiHitToExactThreeCondition") {
    conditionType = "multi_hit_to_3";
  } else if (className === "MultiHitToRangeFourToEightCondition") {
    conditionType = "multi_hit_to_4_8";
  } else if (className === "FirstMoveCondition") {
    conditionType = "first_move";
  }
  
  const properties = Object.getOwnPropertyNames(condition)
    .filter(prop => typeof condition[prop] !== 'function')
    .reduce((obj, prop) => {
      obj[prop] = condition[prop];
      return obj;
    }, {} as any);
  
  return {
    className,
    conditionType,
    properties
  };
}

export function deserializeMoveCondition(conditionData: any): MoveCondition | null {
  if (!conditionData || !conditionData.className) return null;
  
  const ConditionClass = allMoveConditions[conditionData.className];
  if (!ConditionClass) {
    console.warn(`Unknown MoveCondition class: ${conditionData.className}`);
    return null;
  }
  
  try {
    if (conditionData.conditionType) {
      switch (conditionData.conditionType) {
        case "leech_seed":
          return new allMoveConditions.LeechSeedCondition();
        case "multi_hit_to_3":
          return new allMoveConditions.MultiHitToExactThreeCondition();
        case "multi_hit_to_4_8":
          return new allMoveConditions.MultiHitToRangeFourToEightCondition();
        case "first_move":
          return new allMoveConditions.FirstMoveCondition();
      }
    }
    
    if (conditionData.className !== 'MoveCondition') {
      return new ConditionClass();
    }
    
    const instance = new MoveCondition((user, target, move) => true);
    
    if (conditionData.properties) {
      Object.keys(conditionData.properties).forEach(key => {
        if (key !== 'func') { 
          instance[key] = conditionData.properties[key];
        }
      });
    }
    
    return instance;
  } catch (e) {
    console.error(`Failed to deserialize MoveCondition (${conditionData.className}):`, e);
    return null;
  }
}

export function processMoveUpgradeModifierArgsForSerialization(args: any[]): any[] {
  if (!args || !Array.isArray(args) || args.length < 11) return args;
  
  const processedArgs = [...args];
  
  if (Array.isArray(processedArgs[8])) {
    processedArgs[8] = processedArgs[8].map(attr => serializeMoveAttr(attr));
  }
  
  if (Array.isArray(processedArgs[9])) {
    processedArgs[9] = processedArgs[9].map(condition => serializeMoveCondition(condition));
  }
  
  return processedArgs;
}

export function processMoveUpgradeModifierArgsForDeserialization(args: any[]): any[] {
  if (!args || !Array.isArray(args) || args.length < 11) return args;
  
  const processedArgs = [...args];
  
  if (Array.isArray(processedArgs[8])) {
    processedArgs[8] = processedArgs[8]
      .map(attrData => deserializeMoveAttr(attrData))
      .filter(attr => attr !== null);
  }
  
  if (Array.isArray(processedArgs[9])) {
    processedArgs[9] = processedArgs[9]
      .map(conditionData => deserializeMoveCondition(conditionData))
      .filter(condition => condition !== null);
  }
  
  return processedArgs;
} 