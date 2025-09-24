// File Storage - Handles file system operations for the Spark Clone application

import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';
import os from 'os';

export interface FileStorageConfig {
  basePath: string;
  createDirectories?: boolean;
  encoding?: BufferEncoding;
}

export interface StorageMetadata {
  size: number;
  created: Date;
  modified: Date;
  path: string;
}

export class FileStorage {
  private config: FileStorageConfig;
  private basePath: string;

  constructor(config: FileStorageConfig) {
    this.config = {
      createDirectories: true,
      encoding: 'utf8',
      ...config
    };

    // Resolve tilde in path
    this.basePath = this.resolvePath(config.basePath);
  }

  private resolvePath(inputPath: string): string {
    if (inputPath.startsWith('~')) {
      return path.join(os.homedir(), inputPath.slice(1));
    }
    return path.resolve(inputPath);
  }

  /**
   * Initialize storage directories
   */
  async initialize(): Promise<void> {
    if (this.config.createDirectories) {
      await this.ensureDirectory(this.basePath);
      await this.ensureDirectory(path.join(this.basePath, 'history'));
      await this.ensureDirectory(path.join(this.basePath, 'cache'));
      await this.ensureDirectory(path.join(this.basePath, 'logs'));
      await this.ensureDirectory(path.join(this.basePath, 'exports'));
    }
  }

  /**
   * Ensure a directory exists, create if it doesn't
   */
  async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  /**
   * Write data to a file
   */
  async writeFile(filePath: string, data: string | Buffer): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    const dir = path.dirname(fullPath);
    
    await this.ensureDirectory(dir);
    await fs.writeFile(fullPath, data, { encoding: this.config.encoding });
  }

  /**
   * Read data from a file
   */
  async readFile(filePath: string): Promise<string> {
    const fullPath = this.getFullPath(filePath);
    const content = await fs.readFile(fullPath, { encoding: this.config.encoding });
    return content as string;
  }

  /**
   * Check if a file exists
   */
  async exists(filePath: string): Promise<boolean> {
    try {
      const fullPath = this.getFullPath(filePath);
      await fs.access(fullPath);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Delete a file
   */
  async deleteFile(filePath: string): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    await fs.unlink(fullPath);
  }

  /**
   * Get file metadata
   */
  async getMetadata(filePath: string): Promise<StorageMetadata> {
    const fullPath = this.getFullPath(filePath);
    const stats = await fs.stat(fullPath);
    
    return {
      size: stats.size,
      created: stats.birthtime,
      modified: stats.mtime,
      path: fullPath
    };
  }

  /**
   * List files in a directory
   */
  async listFiles(dirPath: string = '', pattern?: RegExp): Promise<string[]> {
    const fullPath = this.getFullPath(dirPath);
    
    try {
      const files = await fs.readdir(fullPath);
      
      if (pattern) {
        return files.filter(file => pattern.test(file));
      }
      
      return files;
    } catch {
      return [];
    }
  }

  /**
   * Write JSON data to a file
   */
  async writeJSON(filePath: string, data: any): Promise<void> {
    const jsonString = JSON.stringify(data, null, 2);
    await this.writeFile(filePath, jsonString);
  }

  /**
   * Read JSON data from a file
   */
  async readJSON<T = any>(filePath: string): Promise<T> {
    const jsonString = await this.readFile(filePath);
    return JSON.parse(jsonString) as T;
  }

  /**
   * Append data to a file
   */
  async appendFile(filePath: string, data: string): Promise<void> {
    const fullPath = this.getFullPath(filePath);
    const dir = path.dirname(fullPath);
    
    await this.ensureDirectory(dir);
    await fs.appendFile(fullPath, data, { encoding: this.config.encoding });
  }

  /**
   * Copy a file
   */
  async copyFile(sourcePath: string, destPath: string): Promise<void> {
    const fullSourcePath = this.getFullPath(sourcePath);
    const fullDestPath = this.getFullPath(destPath);
    const destDir = path.dirname(fullDestPath);
    
    await this.ensureDirectory(destDir);
    await fs.copyFile(fullSourcePath, fullDestPath);
  }

  /**
   * Move a file
   */
  async moveFile(sourcePath: string, destPath: string): Promise<void> {
    const fullSourcePath = this.getFullPath(sourcePath);
    const fullDestPath = this.getFullPath(destPath);
    const destDir = path.dirname(fullDestPath);
    
    await this.ensureDirectory(destDir);
    await fs.rename(fullSourcePath, fullDestPath);
  }

  /**
   * Get the full path for a given relative path
   */
  private getFullPath(filePath: string): string {
    if (path.isAbsolute(filePath)) {
      return filePath;
    }
    return path.join(this.basePath, filePath);
  }

  /**
   * Get the base path
   */
  getBasePath(): string {
    return this.basePath;
  }

  /**
   * Clean up old files based on age
   */
  async cleanupOldFiles(dirPath: string, maxAgeMs: number): Promise<number> {
    const fullPath = this.getFullPath(dirPath);
    let cleanedCount = 0;
    
    try {
      const files = await fs.readdir(fullPath);
      const now = Date.now();
      
      for (const file of files) {
        const filePath = path.join(fullPath, file);
        const stats = await fs.stat(filePath);
        
        if (now - stats.mtime.getTime() > maxAgeMs) {
          await fs.unlink(filePath);
          cleanedCount++;
        }
      }
    } catch {
      // Directory doesn't exist or other error, ignore
    }
    
    return cleanedCount;
  }

  /**
   * Get directory size recursively
   */
  async getDirectorySize(dirPath: string = ''): Promise<number> {
    const fullPath = this.getFullPath(dirPath);
    let totalSize = 0;
    
    try {
      const items = await fs.readdir(fullPath, { withFileTypes: true });
      
      for (const item of items) {
        const itemPath = path.join(fullPath, item.name);
        
        if (item.isDirectory()) {
          totalSize += await this.getDirectorySize(path.relative(this.basePath, itemPath));
        } else {
          const stats = await fs.stat(itemPath);
          totalSize += stats.size;
        }
      }
    } catch {
      // Directory doesn't exist or other error
    }
    
    return totalSize;
  }
}
