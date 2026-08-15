import { ModifierTypeOption } from "../modifier/modifier-type";

type ShopOptionsCache = {
  key: string | null;
  options: ModifierTypeOption[] | null;
};

const cache: ShopOptionsCache = {
  key: null,
  options: null
};

export function getCachedShopOptions(key: string): ModifierTypeOption[] | null {
  return cache.key === key ? cache.options : null;
}

export function cacheShopOptions(key: string, options: ModifierTypeOption[] | null): void {
  cache.key = key;
  cache.options = options;
}

export function clearShopOptionsCache(): void {
  cache.key = null;
  cache.options = null;
}