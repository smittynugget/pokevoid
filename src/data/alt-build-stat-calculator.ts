import { Stat } from "#enums/stat";
import { integer } from "#app/@types/common";

export function calculateStatsToTargetBstWithSwapping(
  originalBaseStats: integer[],
  statFocus: Stat[],
  targetBST: integer
): integer[] {
  const newBaseStats = [...originalBaseStats];

  for (let rankIdx = 0; rankIdx < statFocus.length; rankIdx++) {
    const focusStat = statFocus[rankIdx];

    const ranked: Array<{ stat: Stat; value: number }> = [];
    for (let s = Stat.HP; s <= Stat.SPD; s++) {
      ranked.push({ stat: s as Stat, value: newBaseStats[s] });
    }
    ranked.sort((a, b) => b.value - a.value);

    const highestAtRank = ranked[rankIdx];

    if (focusStat !== highestAtRank.stat) {
      const temp = newBaseStats[focusStat];
      newBaseStats[focusStat] = newBaseStats[highestAtRank.stat];
      newBaseStats[highestAtRank.stat] = temp;
    }
  }

  const currentBST = newBaseStats.reduce((sum, s) => sum + s, 0);
  if (currentBST >= targetBST) {
    return newBaseStats;
  }

  const focusStatIndices = statFocus.map(s => s as number);
  const nonFocusIndices = [0, 1, 2, 3, 4, 5].filter(i => !focusStatIndices.includes(i));
  const allocatedStats = [...newBaseStats];
  const difference = targetBST - currentBST;

  if (difference <= 30) {
    const focusOriginalTotal = focusStatIndices.reduce((sum, i) => sum + newBaseStats[i], 0);

    focusStatIndices.forEach(i => {
      if (focusOriginalTotal > 0) {
        const proportion = newBaseStats[i] / focusOriginalTotal;
        allocatedStats[i] = newBaseStats[i] + Math.floor(difference * proportion);
      } else {
        allocatedStats[i] = newBaseStats[i] + Math.floor(difference / focusStatIndices.length);
      }
    });

    nonFocusIndices.forEach(i => {
      allocatedStats[i] = newBaseStats[i];
    });

    let scaledTotal = allocatedStats.reduce((sum, s) => sum + s, 0);
    let diff = targetBST - scaledTotal;
    let idx = 0;
    while (diff !== 0 && idx < 100) {
      const targetIdx = focusStatIndices[idx % focusStatIndices.length];
      if (diff > 0) {
        allocatedStats[targetIdx]++;
        diff--;
      } else if (diff < 0) {
        allocatedStats[targetIdx]--;
        diff++;
      }
      idx++;
    }

    return allocatedStats;
  }

  function getStatCap(bst: number): number {
    return Math.floor(bst * 0.30);
    if (bst < 450) return Math.floor(bst * 0.40);
    if (bst < 500) return Math.floor(bst * 0.38);
    if (bst < 550) return Math.floor(bst * 0.36);
    if (bst < 600) return Math.floor(bst * 0.34);
    if (bst < 650) return Math.floor(bst * 0.32);
    return Math.floor(bst * 0.30);
  }

  const statCap = getStatCap(targetBST);
  const focusTarget = Math.floor(statCap * 0.80);
  const focusBudget = focusStatIndices.length * focusTarget;
  const nonFocusBudget = targetBST - focusBudget;

  const nonFocusRanked = nonFocusIndices
    .map(i => ({ index: i, value: newBaseStats[i] }))
    .sort((a, b) => b.value - a.value);

  const weights = nonFocusRanked.map((stat, rank) => {
    const percentage = 0.50 - (rank / Math.max(1, nonFocusRanked.length - 1)) * 0.15;
    return { ...stat, percentage, weight: Math.pow(percentage, 1.5) };
  });

  const totalWeight = weights.reduce((sum, w) => sum + w.weight, 0);

  weights.forEach(w => {
    const allocation = Math.floor(nonFocusBudget * (w.weight / totalWeight));
    allocatedStats[w.index] = Math.max(newBaseStats[w.index], allocation);
  });

  const focusBoost = 50;
  const focusWeights = focusStatIndices.map(i => newBaseStats[i] + focusBoost);
  const totalFocusWeight = focusWeights.reduce((sum, w) => sum + w, 0);

  focusStatIndices.forEach((i, idx) => {
    if (totalFocusWeight > 0) {
      allocatedStats[i] = Math.floor(focusBudget * (focusWeights[idx] / totalFocusWeight));
    } else {
      allocatedStats[i] = Math.floor(focusBudget / focusStatIndices.length);
    }
  });

  const cappedStats = allocatedStats.map(s => Math.min(s, statCap));

  let scaledTotal = cappedStats.reduce((sum, s) => sum + s, 0);
  let diff = targetBST - scaledTotal;

  const allIndices = [...focusStatIndices, ...nonFocusIndices];
  let adjustIdx = 0;

  while (diff !== 0 && adjustIdx < 1000) {
    const targetIdx = allIndices[adjustIdx % allIndices.length];

    if (diff > 0 && cappedStats[targetIdx] < statCap) {
      cappedStats[targetIdx]++;
      diff--;
    } else if (diff < 0 && cappedStats[targetIdx] > 1) {
      cappedStats[targetIdx]--;
      diff++;
    }

    adjustIdx++;
  }

  return cappedStats;
}

export function calculateAltBuildStatsWithSwapping(
  originalBaseStats: integer[],
  statFocus: Stat[],
  rank: number
): integer[] {
  if (rank === undefined || rank <= 0) {
    const currentBST = originalBaseStats.reduce((sum, s) => sum + s, 0);
    return calculateStatsToTargetBstWithSwapping(originalBaseStats, statFocus, currentBST as integer);
  }

  const rankClamped = Math.min(rank, 9);
  const targetBST = (425 + (rankClamped * 25)) as integer;
  return calculateStatsToTargetBstWithSwapping(originalBaseStats, statFocus, targetBST);
}