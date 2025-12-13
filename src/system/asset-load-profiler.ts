import Overrides from "../overrides";

export class AssetLoadProfiler {
  private static instance: AssetLoadProfiler;
  private enabled: boolean = false;
  private startTime: number = 0;
  private loadedAssets: Map<string, AssetInfo> = new Map();
  private deferredAssets: Map<string, AssetInfo> = new Map();
  private lazyLoadTriggers: LazyLoadEvent[] = [];

  private categories: Record<string, CategoryData> = {
    summaryUI: { loaded: 0, deferred: 0, estimatedMB: 2 },
    biomes: { loaded: 0, deferred: 0, estimatedMB: 15 },
    trainers: { loaded: 0, deferred: 0, estimatedMB: 25 },
    smittyTrainers: { loaded: 0, deferred: 0, estimatedMB: 3 },
    bgmFanfares: { loaded: 0, deferred: 0, estimatedMB: 8 },
    pokemonIcons: { loaded: 0, deferred: 0, estimatedMB: 20 },
    other: { loaded: 0, deferred: 0, estimatedMB: 5 }
  };

  static getInstance(): AssetLoadProfiler {
    if (!AssetLoadProfiler.instance) {
      AssetLoadProfiler.instance = new AssetLoadProfiler();
    }
    return AssetLoadProfiler.instance;
  }

  enable(): void {
    if (!Overrides.DEBUG_IOS_MODE) return;
    this.enabled = true;
    this.startTime = performance.now();
    console.log('[iOS Profiler] === PROFILING ENABLED ===');
  }

  isEnabled(): boolean {
    return this.enabled && Overrides.DEBUG_IOS_MODE;
  }

  trackLoaded(key: string, sizeBytes?: number): void {
    if (!this.enabled || !Overrides.DEBUG_IOS_MODE) return;
    this.loadedAssets.set(key, { key, sizeBytes, timestamp: performance.now() });
    this.categorizeAsset(key, 'loaded');
  }

  trackDeferred(key: string, estimatedSizeBytes?: number): void {
    if (!this.enabled || !Overrides.DEBUG_IOS_MODE) return;
    this.deferredAssets.set(key, { key, sizeBytes: estimatedSizeBytes, timestamp: performance.now() });
    this.categorizeAsset(key, 'deferred');
  }

  trackLazyLoad(key: string, trigger: string): void {
    if (!this.enabled || !Overrides.DEBUG_IOS_MODE) return;
    const timestamp = performance.now() - this.startTime;
    this.lazyLoadTriggers.push({ key, trigger, timestamp });
    console.log(`[iOS Profiler] LAZY LOAD: "${key}" triggered by ${trigger} at ${(timestamp / 1000).toFixed(2)}s`);
  }

  private categorizeAsset(key: string, type: 'loaded' | 'deferred'): void {
    let category = 'other';

    if (key.startsWith('summary_')) {
      category = 'summaryUI';
    } else if (key.includes('_bg') && !key.includes('party') && !key.includes('title') ||
               key.match(/^[a-z]+_(a|b)$/) ||
               key.match(/^[a-z]+_b_\d$/)) {
      category = 'biomes';
    } else if (key === 'smitty_trainers') {
      category = 'smittyTrainers';
    } else if (key.includes('trainer') || key.includes('rival') || key.includes('player_')) {
      category = 'trainers';
    } else if (key.includes('fanfare') || key.includes('victory_') ||
               key.includes('evolution') || key === 'heal') {
      category = 'bgmFanfares';
    } else if (key.includes('pokemon_icons')) {
      category = 'pokemonIcons';
    }

    this.categories[category][type]++;
  }

  printInitialLoadReport(): void {
    if (!this.enabled || !Overrides.DEBUG_IOS_MODE) return;

    const loadTime = ((performance.now() - this.startTime) / 1000).toFixed(2);
    const totalLoaded = this.loadedAssets.size;
    const totalDeferred = this.deferredAssets.size;

    let estimatedSaved = 0;
    Object.values(this.categories).forEach(cat => {
      if (cat.deferred > 0) {
        const deferredRatio = cat.deferred / (cat.loaded + cat.deferred || 1);
        estimatedSaved += cat.estimatedMB * deferredRatio;
      }
    });

    console.log('\n%c[iOS Profiler] === INITIAL LOAD COMPLETE ===', 'color: #00ff00; font-weight: bold');
    console.log(`%c[iOS Profiler] Total Assets: ${totalLoaded} loaded, ${totalDeferred} deferred`, 'color: #00ff00');
    console.log('%c[iOS Profiler] Categories:', 'color: #00ff00');

    Object.entries(this.categories).forEach(([name, data]) => {
      if (data.loaded > 0 || data.deferred > 0) {
        const status = data.deferred > 0 ? '🔄 DEFERRED' : '✅ LOADED';
        console.log(`  ${status} ${name}: ${data.loaded} loaded, ${data.deferred} deferred (~${data.estimatedMB}MB)`);
      }
    });

    console.log(`%c[iOS Profiler] Load Time: ${loadTime}s`, 'color: #ffff00');
    console.log(`%c[iOS Profiler] Estimated Memory Saved: ~${estimatedSaved.toFixed(0)} MB`, 'color: #00ffff; font-weight: bold');
    console.log('%c[iOS Profiler] ===========================\n', 'color: #00ff00; font-weight: bold');
  }

  printLazyLoadReport(): void {
    if (!this.enabled || !Overrides.DEBUG_IOS_MODE || this.lazyLoadTriggers.length === 0) return;

    console.log('\n%c[iOS Profiler] === LAZY LOAD SUMMARY ===', 'color: #ff00ff; font-weight: bold');
    console.log(`%c[iOS Profiler] Total lazy loads: ${this.lazyLoadTriggers.length}`, 'color: #ff00ff');

    const byTrigger = new Map<string, number>();
    this.lazyLoadTriggers.forEach(event => {
      byTrigger.set(event.trigger, (byTrigger.get(event.trigger) || 0) + 1);
    });

    byTrigger.forEach((count, trigger) => {
      console.log(`  📦 ${trigger}: ${count} loads`);
    });

    console.log('%c[iOS Profiler] ========================\n', 'color: #ff00ff; font-weight: bold');
  }
}

interface AssetInfo {
  key: string;
  sizeBytes?: number;
  timestamp: number;
}

interface LazyLoadEvent {
  key: string;
  trigger: string;
  timestamp: number;
}

interface CategoryData {
  loaded: number;
  deferred: number;
  estimatedMB: number;
}