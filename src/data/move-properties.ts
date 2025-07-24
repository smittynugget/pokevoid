import { MoveCategory, MultiHitAttr, RecoilAttr, SacrificialAttr, HalfSacrificialAttr, SacrificialAttrOnHit, FlinchAttr, ProtectAttr, ChargeAttr, HighCritAttr, CritOnlyAttr, HealAttr, HitHealAttr, StatChangeAttr, StatusEffectAttr, ConfuseAttr, VariablePowerAttr, FixedDamageAttr, LevelDamageAttr, RandomLevelDamageAttr, MoveFlags, IgnoreOpponentStatChangesAttr, RemoveScreensAttr, ForceSwitchOutAttr, StealHeldItemChanceAttr, RemoveHeldItemAttr, WeatherPowerBoostAttr, TerrainPowerBoostAttr, ConsecutiveUseDoublePowerAttr, TurnDamagedDoublePowerAttr, AddArenaTagAttr, WeatherChangeAttr, TerrainChangeAttr, ClearWeatherAttr, ClearTerrainAttr, MatchUserTypeAttr, WeatherBallTypeAttr, TerrainPulseTypeAttr, HiddenPowerTypeAttr, AnyTypeSuperEffectTypeMultiplierAttr, TypelessAttr, AnyTypeMultiplierAttr, AddArenaTrapTagAttr, AddBattlerTagAttr, WeightPowerAttr, CompareWeightPowerAttr, GyroBallPowerAttr, ElectroBallPowerAttr, HpPowerAttr, LowHpPowerAttr, SurviveDamageAttr, TrapAttr, PlantHealAttr, SandHealAttr, MultiStatusEffectAttr, HealStatusEffectAttr, TargetHalfHpDamageAttr, ConsecutiveUseMultiBasePowerAttr } from "#app/data/move.js";
import { BattlerTagType } from "#enums/battler-tag-type.js";
import { ArenaTagType } from "#enums/arena-tag-type.js";

export class MoveProperties {
    public readonly move: any;
    
    constructor(move: any) {
        this.move = move;
    }
    
    get isPhysicalMove(): boolean { return this.move.category === MoveCategory.PHYSICAL; }
    get isSpecialMove(): boolean { return this.move.category === MoveCategory.SPECIAL; }
    get isStatusMove(): boolean { return this.move.category === MoveCategory.STATUS; }
    get hasPower(): boolean { return this.move.power > 0; }
    get baseMovePower(): number { return this.move.power; }
    get hasAccuracy(): boolean { 
        return typeof this.move.accuracy === 'number' && this.move.accuracy > 0 && this.move.accuracy < 101; 
    }
    get baseMoveAccuracy(): number { 
        return typeof this.move.accuracy === 'number' ? this.move.accuracy : -1; 
    }
    get baseMoveChance(): number { return this.move.chance > 0 ? this.move.chance : 0; }
    get hasContact(): boolean { return this.move.hasFlag(MoveFlags.MAKES_CONTACT); }
    get hasRecoil(): boolean { return this.move.hasAttr(RecoilAttr); }
    get hasSacrificialAttr(): boolean { return this.move.hasAttr(SacrificialAttr); }
    get hasSacrificialAttrOnHit(): boolean { return this.move.hasAttr(SacrificialAttrOnHit); }
    get hasHalfSacrificialAttr(): boolean { return this.move.hasAttr(HalfSacrificialAttr); }
    get isSacrificial(): boolean { 
        return this.hasSacrificialAttr || this.hasSacrificialAttrOnHit || this.hasHalfSacrificialAttr; 
    }
    get hasFlinch(): boolean { return this.move.hasAttr(FlinchAttr); }
    get hasProtect(): boolean { return this.move.hasAttr(ProtectAttr); }
    get multiHitAttr(): MultiHitAttr | undefined { 
        return this.move.getAttrs(MultiHitAttr)[0] as MultiHitAttr | undefined; 
    }
    get isMultiHit(): boolean { return !!this.multiHitAttr; }
    get hasCharge(): boolean { return this.move.hasAttr(ChargeAttr); }
    get hasHighCrit(): boolean { return this.move.hasAttr(HighCritAttr); }
    get isCritOnly(): boolean { return this.move.hasAttr(CritOnlyAttr); }
    get isHighCritRatio(): boolean { return this.hasHighCrit || this.isCritOnly; }
    get hasHealAttr(): boolean { return this.move.hasAttr(HealAttr); }
    get hasHitHealAttr(): boolean { return this.move.hasAttr(HitHealAttr); }
    get hasHealing(): boolean { return this.hasHealAttr || this.hasHitHealAttr; }
    get selfBoostAttrs(): StatChangeAttr[] { 
        return this.move.getAttrs(StatChangeAttr).filter((a: StatChangeAttr) => a.selfTarget && a.levels > 0);
    }
    get targetLowerAttrs(): StatChangeAttr[] { 
        return this.move.getAttrs(StatChangeAttr).filter((a: StatChangeAttr) => !a.selfTarget && a.levels < 0);
    }
    get statusEffectAttrs(): StatusEffectAttr[] { return this.move.getAttrs(StatusEffectAttr); }
    get hasConfuseAttr(): boolean { return this.move.hasAttr(ConfuseAttr); }
    get hasStatBoostSelf(): boolean { return this.selfBoostAttrs.length > 0; }
    get hasStatLowerTarget(): boolean { return this.targetLowerAttrs.length > 0; }
    get hasStatusEffect(): boolean { return this.statusEffectAttrs.length > 0 || this.hasConfuseAttr; }
    get ignoresProtect(): boolean { return this.move.hasFlag(MoveFlags.IGNORE_PROTECT); }
    get ignoresAbilities(): boolean { return this.move.hasFlag(MoveFlags.IGNORE_ABILITIES); }
    get hasVariablePower(): boolean { return this.move.hasAttr(VariablePowerAttr); }
    get hasFixedDamage(): boolean { 
        return this.move.hasAttr(FixedDamageAttr) || this.move.hasAttr(LevelDamageAttr) || this.move.hasAttr(RandomLevelDamageAttr);
    }
    get hasPriority(): boolean { return this.move.priority > 0; }
    get basePriority(): number { return this.move.priority; }
    get isSoundBased(): boolean { return this.move.hasFlag(MoveFlags.SOUND_BASED); }
    get isPunchingMove(): boolean { return this.move.hasFlag(MoveFlags.PUNCHING_MOVE); }
    get isSlicingMove(): boolean { return this.move.hasFlag(MoveFlags.SLICING_MOVE); }
    get isBitingMove(): boolean { return this.move.hasFlag(MoveFlags.BITING_MOVE); }
    get isPulseMove(): boolean { return this.move.hasFlag(MoveFlags.PULSE_MOVE); }
    get isBallBombMove(): boolean { return this.move.hasFlag(MoveFlags.BALLBOMB_MOVE); }
    get isPowderMove(): boolean { return this.move.hasFlag(MoveFlags.POWDER_MOVE); }
    get isDanceMove(): boolean { return this.move.hasFlag(MoveFlags.DANCE_MOVE); }
    get isWindMove(): boolean { return this.move.hasFlag(MoveFlags.WIND_MOVE); }
    get hasSecondaryEffectChance(): boolean { return this.move.chance > 0 && this.move.chance <= 100; }
    get hasAnySecondaryEffect(): boolean { 
        return this.hasSecondaryEffectChance && (this.hasStatLowerTarget || this.hasStatusEffect || this.hasFlinch); 
    }
    get hasGuaranteedSecondaryEffect(): boolean { 
        return (this.move.chance === 100 || this.move.chance === -1) && (this.hasStatLowerTarget || this.hasStatusEffect || this.hasFlinch); 
    }
    get hasAnyEffectWithChance(): boolean { 
        return this.hasAnySecondaryEffect || (this.hasSecondaryEffectChance && (this.hasStatBoostSelf || this.hasHitHealAttr)); 
    }
    get hasForceSwitch(): boolean { return this.move.hasAttr(ForceSwitchOutAttr); }
    
    get healAttr(): HealAttr | undefined { return this.move.getAttrs(HealAttr)[0] as HealAttr | undefined; }
    get hitHealAttr(): HitHealAttr | undefined { return this.move.getAttrs(HitHealAttr)[0] as HitHealAttr | undefined; }
    get highCritAttr(): HighCritAttr | undefined { return this.move.getAttrs(HighCritAttr)[0] as HighCritAttr | undefined; }
    get recoilAttr(): RecoilAttr | undefined { return this.move.getAttrs(RecoilAttr)[0] as RecoilAttr | undefined; }
    
    hasAttr(attrClass: any): boolean { return this.move.hasAttr(attrClass); }
    getAttrs(attrClass: any): any[] { return this.move.getAttrs(attrClass); }
    hasFlag(flag: MoveFlags): boolean { return this.move.hasFlag(flag); }
    
    hasAnyBattlerTag(tags: BattlerTagType[]): boolean {
        return this.move.getAttrs(AddBattlerTagAttr).some((a: AddBattlerTagAttr) => tags.includes(a.tagType));
    }
    
    hasArenaTag(tag: ArenaTagType): boolean {
        return this.move.getAttrs(AddArenaTagAttr).some((a: AddArenaTagAttr) => a.tagType === tag);
    }
    
    hasArenaTrapTag(tag: ArenaTagType): boolean {
        return this.move.getAttrs(AddArenaTrapTagAttr).some((a: AddArenaTrapTagAttr) => a.tagType === tag);
    }
} 