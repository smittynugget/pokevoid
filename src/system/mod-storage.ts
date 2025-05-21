import { Species } from "../enums/species";

export interface StoredMod {
    id: string;
    speciesId: Species;
    formName: string;
    jsonData: any;
    spriteData: string;
    iconData: string;
    createdAt: number;
    updatedAt: number;
}

export class ModStorage {
    private readonly DB_NAME = 'PokeVoidModDB';
    private readonly STORE_NAME = 'mods';
    private readonly DB_VERSION = 1;
    private db: IDBDatabase | null = null;
    
    private modCache: StoredMod[] | null = null;
    
    public async init(): Promise<void> {
        if (this.db) {
            return Promise.resolve();
        }
        
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.DB_NAME, this.DB_VERSION);
            
            request.onerror = (event) => {
                console.error('Failed to open mod database:', event);
                reject(new Error('Could not open mod database'));
            };
            
            request.onsuccess = (event) => {
                this.db = (event.target as IDBOpenDBRequest).result;
                resolve();
            };
            
            request.onupgradeneeded = (event) => {
                const db = (event.target as IDBOpenDBRequest).result;
                
                if (!db.objectStoreNames.contains(this.STORE_NAME)) {
                    const store = db.createObjectStore(this.STORE_NAME, { keyPath: 'id' });
                    
                    store.createIndex('speciesId', 'speciesId', { unique: false });
                    store.createIndex('formName', 'formName', { unique: false });
                    store.createIndex('createdAt', 'createdAt', { unique: false });
                }
            };
        });
    }
    
    private generateModId(speciesId: Species, formName: string): string {
        return `${speciesId}_${formName.toLowerCase().replace(/[^a-z0-9]/g, '')}`;
    }
    
    
    public async storeMod(mod: Omit<StoredMod, 'id' | 'createdAt' | 'updatedAt'>): Promise<StoredMod> {
        await this.init();
        
        const now = Date.now();
        const id = this.generateModId(mod.speciesId, mod.formName);
        
        const existingMod = await this.getMod(id);
        
        const storedMod: StoredMod = {
            id,
            ...mod,
            createdAt: existingMod ? existingMod.createdAt : now,
            updatedAt: now
        };
        
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
            
            transaction.onerror = (event) => {
                console.error('Transaction error:', event);
                reject(new Error('Failed to store mod'));
            };
            
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.put(storedMod);
            
            request.onsuccess = () => {
                resolve(storedMod);
            };
            
            request.onerror = (event) => {
                console.error('Store error:', event);
                reject(new Error('Failed to store mod'));
            };
        });
    }
    
    public async getMod(id: string): Promise<StoredMod | null> {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.get(id);
            
            request.onsuccess = () => {
                resolve(request.result || null);
            };
            
            request.onerror = (event) => {
                console.error('Get error:', event);
                reject(new Error('Failed to get mod'));
            };
        });
    }
    
    public async getAllMods(): Promise<StoredMod[]> {
        await this.init();
        
        if (this.modCache) {
            return Promise.resolve(this.modCache);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.getAll();
            
            request.onsuccess = () => {
                const result = request.result || [];
                this.modCache = result;
                resolve(result);
            };
            
            request.onerror = (event) => {
                console.error('GetAll error:', event);
                reject(new Error('Failed to get all mods'));
            };
        });
    }
    
    public async getModsBySpecies(speciesId: Species): Promise<StoredMod[]> {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            const index = store.index('speciesId');
            const request = index.getAll(speciesId);
            
            request.onsuccess = () => {
                resolve(request.result || []);
            };
            
            request.onerror = (event) => {
                console.error('GetBySpecies error:', event);
                reject(new Error('Failed to get mods by species'));
            };
        });
    }
    
    public async deleteMod(id: string): Promise<void> {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.delete(id);
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Delete error:', event);
                reject(new Error('Failed to delete mod'));
            };
        });
    }
    
    public async clearAllMods(): Promise<void> {
        await this.init();
        
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.STORE_NAME], 'readwrite');
            const store = transaction.objectStore(this.STORE_NAME);
            const request = store.clear();
            
            request.onsuccess = () => {
                resolve();
            };
            
            request.onerror = (event) => {
                console.error('Clear error:', event);
                reject(new Error('Failed to clear mods'));
            };
        });
    }

    public async hasMods(): Promise<boolean> {
        await this.init();
        
        if (this.modCache) {
            return Promise.resolve(this.modCache.length > 0);
        }
        
        return new Promise((resolve, reject) => {
            const transaction = this.db!.transaction([this.STORE_NAME], 'readonly');
            const store = transaction.objectStore(this.STORE_NAME);
            
            const countRequest = store.count();
            
            countRequest.onsuccess = () => {
                resolve(countRequest.result > 0);
            };
            
            countRequest.onerror = (event) => {
                console.error('Count error:', event);
                reject(new Error('Failed to check if mods exist'));
            };
        });
    }
}

export const modStorage = new ModStorage();