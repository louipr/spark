// Cache Manager - Handles response caching for performance optimization

import { FileStorage } from './FileStorage.js';
import crypto from 'crypto';

export interface CacheEntry<T = any> {
  key: string;
  value: T;
  timestamp: Date;
  ttl: number; // Time to live in seconds
  metadata?: {
    size: number;
    accessCount: number;
    lastAccessed: Date;
  };
}

export interface CacheConfig {
  ttl: number; // Default TTL in seconds
  storage: FileStorage;
  maxSize?: number; // Maximum cache size in bytes
  cleanupInterval?: number; // Cleanup interval in milliseconds
}

export interface CacheStats {
  totalEntries: number;
  totalSize: number;
  hitRate: number;
  missRate: number;
  oldestEntry: Date;
  newestEntry: Date;
}

export class CacheManager {
  private config: CacheConfig;
  private cacheDir = 'cache';
  private indexFile = 'cache/index.json';
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0
  };
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: CacheConfig) {
    this.config = {
      maxSize: 100 * 1024 * 1024, // 100MB default
      cleanupInterval: 5 * 60 * 1000, // 5 minutes default
      ...config
    };

    this.startCleanupTimer();
  }

  /**
   * Initialize cache storage
   */
  async initialize(): Promise<void> {
    await this.config.storage.initialize();
    
    // Create cache index if it doesn't exist
    if (!(await this.config.storage.exists(this.indexFile))) {
      await this.config.storage.writeJSON(this.indexFile, {
        entries: {},
        totalSize: 0,
        lastCleanup: new Date().toISOString()
      });
    }

    // Perform initial cleanup
    await this.cleanup();
  }

  /**
   * Set a cache entry
   */
  async set<T>(key: string, value: T, ttl?: number): Promise<void> {
    const cacheKey = this.generateCacheKey(key);
    const entryTtl = ttl || this.config.ttl;
    
    const entry: CacheEntry<T> = {
      key,
      value,
      timestamp: new Date(),
      ttl: entryTtl,
      metadata: {
        size: this.estimateSize(value),
        accessCount: 0,
        lastAccessed: new Date()
      }
    };

    // Store the entry
    const entryFile = `${this.cacheDir}/entry_${cacheKey}.json`;
    await this.config.storage.writeJSON(entryFile, entry);

    // Update index
    await this.updateIndex(cacheKey, entry);
    
    this.stats.sets++;

    // Check if cache size exceeds limit
    await this.enforceMaxSize();
  }

  /**
   * Get a cache entry
   */
  async get<T>(key: string): Promise<T | null> {
    const cacheKey = this.generateCacheKey(key);
    const entryFile = `${this.cacheDir}/entry_${cacheKey}.json`;

    try {
      if (!(await this.config.storage.exists(entryFile))) {
        this.stats.misses++;
        return null;
      }

      const entry: CacheEntry<T> = await this.config.storage.readJSON(entryFile);
      
      // Check if entry has expired
      const age = (Date.now() - new Date(entry.timestamp).getTime()) / 1000;
      if (age > entry.ttl) {
        await this.delete(key);
        this.stats.misses++;
        return null;
      }

      // Update access metadata
      entry.metadata = entry.metadata || {
        size: this.estimateSize(entry.value),
        accessCount: 0,
        lastAccessed: new Date()
      };
      entry.metadata.accessCount++;
      entry.metadata.lastAccessed = new Date();

      // Save updated metadata
      await this.config.storage.writeJSON(entryFile, entry);
      
      this.stats.hits++;
      return entry.value;
    } catch (error) {
      this.stats.misses++;
      return null;
    }
  }

  /**
   * Check if a cache entry exists and is valid
   */
  async has(key: string): Promise<boolean> {
    const cacheKey = this.generateCacheKey(key);
    const entryFile = `${this.cacheDir}/entry_${cacheKey}.json`;

    try {
      if (!(await this.config.storage.exists(entryFile))) {
        return false;
      }

      const entry: CacheEntry = await this.config.storage.readJSON(entryFile);
      const age = (Date.now() - new Date(entry.timestamp).getTime()) / 1000;
      
      return age <= entry.ttl;
    } catch {
      return false;
    }
  }

  /**
   * Delete a cache entry
   */
  async delete(key: string): Promise<void> {
    const cacheKey = this.generateCacheKey(key);
    const entryFile = `${this.cacheDir}/entry_${cacheKey}.json`;

    try {
      if (await this.config.storage.exists(entryFile)) {
        await this.config.storage.deleteFile(entryFile);
        await this.removeFromIndex(cacheKey);
        this.stats.deletes++;
      }
    } catch (error) {
      // Ignore errors when deleting non-existent entries
    }
  }

  /**
   * Clear all cache entries
   */
  async clear(): Promise<void> {
    try {
      const files = await this.config.storage.listFiles(this.cacheDir, /^entry_.*\.json$/);
      
      for (const file of files) {
        await this.config.storage.deleteFile(`${this.cacheDir}/${file}`);
      }

      // Reset index
      await this.config.storage.writeJSON(this.indexFile, {
        entries: {},
        totalSize: 0,
        lastCleanup: new Date().toISOString()
      });

      this.stats.deletes += files.length;
    } catch (error) {
      console.error('Error clearing cache:', error);
    }
  }

  /**
   * Get cache statistics
   */
  async getStats(): Promise<CacheStats> {
    try {
      const index = await this.config.storage.readJSON(this.indexFile);
      const entries = Object.values(index.entries || {}) as any[];
      
      const timestamps = entries.map(e => new Date(e.timestamp));
      const totalRequests = this.stats.hits + this.stats.misses;
      
      return {
        totalEntries: entries.length,
        totalSize: index.totalSize || 0,
        hitRate: totalRequests > 0 ? this.stats.hits / totalRequests : 0,
        missRate: totalRequests > 0 ? this.stats.misses / totalRequests : 0,
        oldestEntry: timestamps.length > 0 ? new Date(Math.min(...timestamps.map(t => t.getTime()))) : new Date(),
        newestEntry: timestamps.length > 0 ? new Date(Math.max(...timestamps.map(t => t.getTime()))) : new Date()
      };
    } catch {
      return {
        totalEntries: 0,
        totalSize: 0,
        hitRate: 0,
        missRate: 1,
        oldestEntry: new Date(),
        newestEntry: new Date()
      };
    }
  }

  /**
   * Cleanup expired entries
   */
  async cleanup(): Promise<number> {
    let cleanedCount = 0;

    try {
      const files = await this.config.storage.listFiles(this.cacheDir, /^entry_.*\.json$/);
      const now = Date.now();

      for (const file of files) {
        try {
          const entry: CacheEntry = await this.config.storage.readJSON(`${this.cacheDir}/${file}`);
          const age = (now - new Date(entry.timestamp).getTime()) / 1000;
          
          if (age > entry.ttl) {
            await this.config.storage.deleteFile(`${this.cacheDir}/${file}`);
            const cacheKey = this.extractCacheKeyFromFilename(file);
            await this.removeFromIndex(cacheKey);
            cleanedCount++;
          }
        } catch {
          // If we can't read the entry, delete it
          await this.config.storage.deleteFile(`${this.cacheDir}/${file}`);
          cleanedCount++;
        }
      }

      // Update cleanup timestamp in index
      const index = await this.config.storage.readJSON(this.indexFile);
      index.lastCleanup = new Date().toISOString();
      await this.config.storage.writeJSON(this.indexFile, index);

    } catch (error) {
      console.error('Error during cache cleanup:', error);
    }

    return cleanedCount;
  }

  /**
   * Generate a cache key hash
   */
  private generateCacheKey(key: string): string {
    return crypto.createHash('sha256').update(key).digest('hex');
  }

  /**
   * Estimate the size of a value in bytes
   */
  private estimateSize(value: any): number {
    return Buffer.byteLength(JSON.stringify(value), 'utf8');
  }

  /**
   * Update the cache index
   */
  private async updateIndex(cacheKey: string, entry: CacheEntry): Promise<void> {
    try {
      const index = await this.config.storage.readJSON(this.indexFile);
      
      const oldEntry = index.entries[cacheKey];
      const oldSize = oldEntry ? oldEntry.size || 0 : 0;
      const newSize = entry.metadata?.size || 0;
      
      index.entries[cacheKey] = {
        key: entry.key,
        timestamp: entry.timestamp.toISOString(),
        ttl: entry.ttl,
        size: newSize
      };
      
      index.totalSize = (index.totalSize || 0) - oldSize + newSize;
      
      await this.config.storage.writeJSON(this.indexFile, index);
    } catch (error) {
      console.error('Error updating cache index:', error);
    }
  }

  /**
   * Remove entry from index
   */
  private async removeFromIndex(cacheKey: string): Promise<void> {
    try {
      const index = await this.config.storage.readJSON(this.indexFile);
      
      const entry = index.entries[cacheKey];
      if (entry) {
        index.totalSize = (index.totalSize || 0) - (entry.size || 0);
        delete index.entries[cacheKey];
        await this.config.storage.writeJSON(this.indexFile, index);
      }
    } catch (error) {
      console.error('Error removing from cache index:', error);
    }
  }

  /**
   * Enforce maximum cache size by removing least recently used entries
   */
  private async enforceMaxSize(): Promise<void> {
    if (!this.config.maxSize) return;

    try {
      const stats = await this.getStats();
      if (stats.totalSize <= this.config.maxSize) return;

      // Get all entries sorted by last access time
      const files = await this.config.storage.listFiles(this.cacheDir, /^entry_.*\.json$/);
      const entriesWithAccess: Array<{ file: string; lastAccessed: Date; size: number }> = [];

      for (const file of files) {
        try {
          const entry: CacheEntry = await this.config.storage.readJSON(`${this.cacheDir}/${file}`);
          entriesWithAccess.push({
            file,
            lastAccessed: new Date(entry.metadata?.lastAccessed || entry.timestamp),
            size: entry.metadata?.size || 0
          });
        } catch {
          // Skip invalid entries
        }
      }

      // Sort by least recently used first
      entriesWithAccess.sort((a, b) => a.lastAccessed.getTime() - b.lastAccessed.getTime());

      // Remove entries until we're under the size limit
      let currentSize = stats.totalSize;
      for (const entry of entriesWithAccess) {
        if (currentSize <= this.config.maxSize) break;
        
        await this.config.storage.deleteFile(`${this.cacheDir}/${entry.file}`);
        const cacheKey = this.extractCacheKeyFromFilename(entry.file);
        await this.removeFromIndex(cacheKey);
        
        currentSize -= entry.size;
        this.stats.deletes++;
      }
    } catch (error) {
      console.error('Error enforcing cache size limit:', error);
    }
  }

  /**
   * Extract cache key from filename
   */
  private extractCacheKeyFromFilename(filename: string): string {
    return filename.replace('entry_', '').replace('.json', '');
  }

  /**
   * Start cleanup timer
   */
  private startCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }

    this.cleanupTimer = setInterval(async () => {
      await this.cleanup();
    }, this.config.cleanupInterval);
  }

  /**
   * Stop cleanup timer
   */
  private stopCleanupTimer(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = undefined;
    }
  }

  /**
   * Flush any pending operations
   */
  async flush(): Promise<void> {
    await this.cleanup();
  }

  /**
   * Shutdown the cache manager
   */
  async shutdown(): Promise<void> {
    this.stopCleanupTimer();
    await this.flush();
  }
}
