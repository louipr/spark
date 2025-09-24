// src/core/agent/tools/ToolRegistry.ts
import { ExecutionContext } from '../planner/WorkflowPlanner.js';

export interface AgentTool {
  name: string;
  description: string;
  execute(params: any, context: ExecutionContext): Promise<any>;
  validate(params: any): boolean;
}

export class ToolRegistry {
  private tools = new Map<string, AgentTool>();

  register(tool: AgentTool): void {
    this.tools.set(tool.name, tool);
    console.log(`Registered tool: ${tool.name}`);
  }

  getTool(name: string): AgentTool | undefined {
    return this.tools.get(name);
  }

  listTools(): AgentTool[] {
    return Array.from(this.tools.values());
  }

  getToolNames(): string[] {
    return Array.from(this.tools.keys());
  }

  hasTools(): boolean {
    return this.tools.size > 0;
  }

  getToolsForCapability(capability: string): AgentTool[] {
    return this.listTools().filter(tool => 
      tool.description.toLowerCase().includes(capability.toLowerCase())
    );
  }

  unregister(toolName: string): boolean {
    const removed = this.tools.delete(toolName);
    if (removed) {
      console.log(`Unregistered tool: ${toolName}`);
    }
    return removed;
  }

  clear(): void {
    this.tools.clear();
    console.log('Cleared all tools from registry');
  }
}
