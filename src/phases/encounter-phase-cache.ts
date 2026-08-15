import type { ChaosEncounterPhase as ChaosType } from "./chaos-encounter-phase";
import type { NextEncounterPhase as NextType } from "./next-encounter-phase";
import type { NewBiomeEncounterPhase as NewBiomeType } from "./new-biome-encounter-phase";
import type { ReturnPhase as ReturnType } from "./return-phase";
import type { SummonMissingPhase as SummonMissingType } from "./summon-missing-phase";

let ChaosEncounterPhaseCtor: typeof ChaosType | null = null;
let NextEncounterPhaseCtor: typeof NextType | null = null;
let NewBiomeEncounterPhaseCtor: typeof NewBiomeType | null = null;
let ReturnPhaseCtor: typeof ReturnType | null = null;
let SummonMissingPhaseCtor: typeof SummonMissingType | null = null;

export async function preloadEncounterPhaseModules(): Promise<void> {
  const [chaos, next, newBiome, ret, summonMissing] = await Promise.all([
    import("./chaos-encounter-phase"),
    import("./next-encounter-phase"),
    import("./new-biome-encounter-phase"),
    import("./return-phase"),
    import("./summon-missing-phase"),
  ]);
  ChaosEncounterPhaseCtor = chaos.ChaosEncounterPhase;
  NextEncounterPhaseCtor = next.NextEncounterPhase;
  NewBiomeEncounterPhaseCtor = newBiome.NewBiomeEncounterPhase;
  ReturnPhaseCtor = ret.ReturnPhase;
  SummonMissingPhaseCtor = summonMissing.SummonMissingPhase;
}

export function getChaosEncounterPhase(): typeof ChaosType {
  if (!ChaosEncounterPhaseCtor) throw new Error("Encounter phases not preloaded — call preloadEncounterPhaseModules() first");
  return ChaosEncounterPhaseCtor;
}

export function getNextEncounterPhase(): typeof NextType {
  if (!NextEncounterPhaseCtor) throw new Error("Encounter phases not preloaded — call preloadEncounterPhaseModules() first");
  return NextEncounterPhaseCtor;
}

export function getNewBiomeEncounterPhase(): typeof NewBiomeType {
  if (!NewBiomeEncounterPhaseCtor) throw new Error("Encounter phases not preloaded — call preloadEncounterPhaseModules() first");
  return NewBiomeEncounterPhaseCtor;
}

export function getReturnPhase(): typeof ReturnType {
  if (!ReturnPhaseCtor) throw new Error("Encounter phases not preloaded — call preloadEncounterPhaseModules() first");
  return ReturnPhaseCtor;
}

export function getSummonMissingPhase(): typeof SummonMissingType {
  if (!SummonMissingPhaseCtor) throw new Error("Encounter phases not preloaded — call preloadEncounterPhaseModules() first");
  return SummonMissingPhaseCtor;
}