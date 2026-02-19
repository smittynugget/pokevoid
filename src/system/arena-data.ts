import { Arena } from "../field/arena";
import { ArenaTag, ArenaTrapTag, getArenaTag } from "../data/arena-tag";
import { Biome } from "#enums/biome";
import { Weather } from "../data/weather";
import { Terrain } from "#app/data/terrain.js";

export default class ArenaData {
  public biome: Biome;
  public weather: Weather | null;
  public terrain: Terrain | null;
  public tags: ArenaTag[];

  constructor(source: Arena | any) {
    const sourceArena = source instanceof Arena ? source as Arena : null;
    this.biome = sourceArena ? sourceArena.biomeType : source.biome;
    this.weather = sourceArena ? sourceArena.weather : source.weather ? new Weather(source.weather.weatherType, source.weather.turnsLeft) : null;
    this.terrain = sourceArena ? sourceArena.terrain : source.terrain ? new Terrain(source.terrain.terrainType, source.terrain.turnsLeft) : null;
    this.tags = sourceArena
      ? sourceArena.tags
      : (source.tags || []).map((t: any) => {
          const tag = getArenaTag(t.tagType, t.turnCount, t.sourceMove, t.sourceId, t.targetIndex, t.side);
          if (!tag) return null;
          if (tag instanceof ArenaTrapTag && typeof t.layers === "number") {
            tag.layers = t.layers;
          }
          return tag;
        }).filter((t: ArenaTag | null): t is ArenaTag => t !== null);
  }
}