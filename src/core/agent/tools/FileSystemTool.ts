// src/core/agent/tools/FileSystemTool.ts
import * as fs from 'fs/promises';
import * as path from 'path';
import { AgentTool } from './ToolRegistry.js';
import { ExecutionContext } from '../planner/WorkflowPlanner.js';

export class FileSystemTool implements AgentTool {
  name = 'file_system';
  description = 'File system operations including read, write, create directories';

  async execute(params: { action: string; path: string; content?: string; encoding?: string }, context: ExecutionContext): Promise<any> {
    if (!this.validate(params)) {
      throw new Error('Invalid parameters for FileSystem tool');
    }

    try {
      const fullPath = path.isAbsolute(params.path) 
        ? params.path 
        : path.join(context.workingDirectory, params.path);

      console.log(`FileSystem ${params.action}: ${fullPath}`);

      switch (params.action) {
        case 'write':
          await this.ensureDirectoryExists(path.dirname(fullPath));
          await fs.writeFile(fullPath, params.content || '', params.encoding as BufferEncoding || 'utf-8');
          
          // Store created file in context
          const createdFiles = context.state.get('created_files') || [];
          createdFiles.push(fullPath);
          context.state.set('created_files', createdFiles);

          return {
            type: 'file_created',
            path: fullPath,
            size: (params.content || '').length,
            success: true
          };

        case 'read':
          const content = await fs.readFile(fullPath, params.encoding as BufferEncoding || 'utf-8');
          return {
            type: 'file_read',
            path: fullPath,
            content,
            size: content.length,
            success: true
          };

        case 'create_dir':
          await fs.mkdir(fullPath, { recursive: true });
          
          // Store created directory in context
          const createdDirs = context.state.get('created_directories') || [];
          createdDirs.push(fullPath);
          context.state.set('created_directories', createdDirs);

          return {
            type: 'directory_created',
            path: fullPath,
            success: true
          };

        case 'list':
          const items = await fs.readdir(fullPath, { withFileTypes: true });
          const listing = items.map(item => ({
            name: item.name,
            type: item.isDirectory() ? 'directory' : 'file',
            path: path.join(fullPath, item.name)
          }));

          return {
            type: 'directory_listing',
            path: fullPath,
            items: listing,
            count: listing.length,
            success: true
          };

        case 'exists':
          try {
            await fs.access(fullPath);
            return {
              type: 'file_exists',
              path: fullPath,
              exists: true,
              success: true
            };
          } catch {
            return {
              type: 'file_exists',
              path: fullPath,
              exists: false,
              success: true
            };
          }

        case 'delete':
          const stats = await fs.stat(fullPath);
          if (stats.isDirectory()) {
            await fs.rmdir(fullPath, { recursive: true });
          } else {
            await fs.unlink(fullPath);
          }

          return {
            type: 'file_deleted',
            path: fullPath,
            wasDirectory: stats.isDirectory(),
            success: true
          };

        case 'copy':
          if (!params.content) {
            throw new Error('Copy action requires "content" parameter as destination path');
          }
          
          const destPath = path.isAbsolute(params.content) 
            ? params.content 
            : path.join(context.workingDirectory, params.content);
          
          await this.ensureDirectoryExists(path.dirname(destPath));
          await fs.copyFile(fullPath, destPath);

          return {
            type: 'file_copied',
            sourcePath: fullPath,
            destinationPath: destPath,
            success: true
          };

        default:
          throw new Error(`Unknown file system action: ${params.action}`);
      }
    } catch (error) {
      console.error('FileSystem tool error:', error);
      return {
        type: 'file_system_error',
        action: params.action,
        path: params.path,
        error: error instanceof Error ? error.message : 'Unknown error',
        success: false
      };
    }
  }

  validate(params: any): boolean {
    if (!params || typeof params.action !== 'string' || typeof params.path !== 'string') {
      return false;
    }

    const validActions = ['write', 'read', 'create_dir', 'list', 'exists', 'delete', 'copy'];
    if (!validActions.includes(params.action)) {
      return false;
    }

    // Security check - prevent access to sensitive paths
    const dangerousPaths = [
      '/etc/passwd',
      '/etc/shadow',
      '/root',
      'C:\\Windows\\System32',
      '/System',
      '/Library'
    ];

    const normalizedPath = path.normalize(params.path).toLowerCase();
    for (const dangerous of dangerousPaths) {
      if (normalizedPath.includes(dangerous.toLowerCase())) {
        console.warn(`Blocked access to sensitive path: ${params.path}`);
        return false;
      }
    }

    return params.path.length > 0;
  }

  private async ensureDirectoryExists(dirPath: string): Promise<void> {
    try {
      await fs.mkdir(dirPath, { recursive: true });
    } catch (error) {
      // Directory might already exist, which is fine
      if ((error as any).code !== 'EEXIST') {
        throw error;
      }
    }
  }
}
