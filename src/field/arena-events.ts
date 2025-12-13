import { ArenaTagSide } from "#app/data/arena-tag.js";
import { ArenaTagType } from "#enums/arena-tag-type";
import { TerrainType } from "#app/data/terrain.js";
import { WeatherType } from "#app/data/weather.js";
export enum ArenaEventType {

  WEATHER_CHANGED = "onWeatherChanged",

  TERRAIN_CHANGED = "onTerrainChanged",
  TAG_ADDED = "onTagAdded",

  TAG_REMOVED = "onTagRemoved",
}
export class ArenaEvent extends Event {

  public duration: number;
  constructor(eventType: ArenaEventType, duration: number) {
    super(eventType);

    this.duration = duration;
  }
}

export class WeatherChangedEvent extends ArenaEvent {

  public oldWeatherType: WeatherType;

  public newWeatherType: WeatherType;
  constructor(oldWeatherType: WeatherType, newWeatherType: WeatherType, duration: number) {
    super(ArenaEventType.WEATHER_CHANGED, duration);

    this.oldWeatherType = oldWeatherType;
    this.newWeatherType = newWeatherType;
  }
}

export class TerrainChangedEvent extends ArenaEvent {

  public oldTerrainType: TerrainType;

  public newTerrainType: TerrainType;
  constructor(oldTerrainType: TerrainType, newTerrainType: TerrainType, duration: number) {
    super(ArenaEventType.TERRAIN_CHANGED, duration);

    this.oldTerrainType = oldTerrainType;
    this.newTerrainType = newTerrainType;
  }
}
export class TagAddedEvent extends ArenaEvent {

  public arenaTagType: ArenaTagType;

  public arenaTagSide: ArenaTagSide;
  constructor(arenaTagType: ArenaTagType, arenaTagSide: ArenaTagSide, duration: number) {
    super(ArenaEventType.TAG_ADDED, duration);

    this.arenaTagType = arenaTagType;
    this.arenaTagSide = arenaTagSide;
  }
}

export class TagRemovedEvent extends ArenaEvent {

  public arenaTagType: ArenaTagType;

  public arenaTagSide: ArenaTagSide;
  constructor(arenaTagType: ArenaTagType, arenaTagSide: ArenaTagSide, duration: number) {
    super(ArenaEventType.TAG_REMOVED, duration);

    this.arenaTagType = arenaTagType;
    this.arenaTagSide = arenaTagSide;
  }
}