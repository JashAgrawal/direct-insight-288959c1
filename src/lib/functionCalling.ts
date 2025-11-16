import { useTaskStore } from '@/stores/taskStore';

export interface FunctionCall {
  name: string;
  arguments: Record<string, any>;
}

export interface FunctionDefinition {
  name: string;
  description: string;
  parameters: {
    type: 'object';
    properties: Record<string, {
      type: string;
      description: string;
      enum?: string[];
    }>;
    required: string[];
  };
}

// Available functions for Assistant agent
export const ASSISTANT_FUNCTIONS: FunctionDefinition[] = [
  {
    name: 'create_task',
    description: 'Create a new task for the user or assign to an agent',
    parameters: {
      type: 'object',
      properties: {
        title: {
          type: 'string',
          description: 'Short, actionable task title',
        },
        description: {
          type: 'string',
          description: 'Detailed description of what needs to be done',
        },
        priority: {
          type: 'string',
          description: 'Task priority level',
          enum: ['low', 'medium', 'high', 'urgent'],
        },
        assignedTo: {
          type: 'string',
          description: 'Agent ID to assign this task to (optional)',
        },
        tags: {
          type: 'array',
          description: 'Tags for categorizing the task (optional)',
        },
      },
      required: ['title', 'description', 'priority'],
    },
  },
  {
    name: 'update_task',
    description: 'Update an existing task status or details',
    parameters: {
      type: 'object',
      properties: {
        taskId: {
          type: 'string',
          description: 'ID of the task to update',
        },
        status: {
          type: 'string',
          description: 'New status for the task',
          enum: ['todo', 'in-progress', 'done', 'blocked'],
        },
        priority: {
          type: 'string',
          description: 'New priority level',
          enum: ['low', 'medium', 'high', 'urgent'],
        },
      },
      required: ['taskId'],
    },
  },
];

// Execute a function call
export function executeFunctionCall(
  functionCall: FunctionCall,
  ideaId: string
): { success: boolean; result: string; data?: any } {
  const { name, arguments: args } = functionCall;

  try {
    switch (name) {
      case 'create_task': {
        const taskId = useTaskStore.getState().addTask({
          ideaId,
          title: args.title,
          description: args.description,
          status: 'todo',
          priority: args.priority || 'medium',
          assignedTo: args.assignedTo,
          tags: args.tags,
        });

        return {
          success: true,
          result: `Task created: "${args.title}" (ID: ${taskId})`,
          data: { taskId },
        };
      }

      case 'update_task': {
        const updates: any = {};
        if (args.status) updates.status = args.status;
        if (args.priority) updates.priority = args.priority;

        useTaskStore.getState().updateTask(args.taskId, updates);

        return {
          success: true,
          result: `Task ${args.taskId} updated successfully`,
          data: { taskId: args.taskId, updates },
        };
      }

      default:
        return {
          success: false,
          result: `Unknown function: ${name}`,
        };
    }
  } catch (error) {
    return {
      success: false,
      result: `Error executing ${name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
    };
  }
}

// Parse function calls from AI response
export function parseFunctionCalls(response: string): FunctionCall[] {
  const functionCalls: FunctionCall[] = [];
  
  // Look for function call patterns like:
  // FUNCTION_CALL: create_task
  // ARGUMENTS: {"title": "...", "description": "...", "priority": "high"}
  
  const functionPattern = /FUNCTION_CALL:\s*(\w+)\s*ARGUMENTS:\s*(\{[\s\S]*?\})/gi;
  let match;
  
  while ((match = functionPattern.exec(response)) !== null) {
    try {
      const name = match[1];
      const args = JSON.parse(match[2]);
      functionCalls.push({ name, arguments: args });
    } catch (error) {
      console.error('Failed to parse function call:', error);
    }
  }
  
  return functionCalls;
}

// Generate function calling documentation for system prompt
export function getFunctionCallingDocs(): string {
  return `
## FUNCTION CALLING

You have access to the following functions to help manage tasks:

${ASSISTANT_FUNCTIONS.map(fn => `
### ${fn.name}
${fn.description}

Parameters:
${Object.entries(fn.parameters.properties).map(([key, prop]) => 
  `- ${key} (${prop.type}${fn.parameters.required.includes(key) ? ', required' : ', optional'}): ${prop.description}${prop.enum ? ` [${prop.enum.join('|')}]` : ''}`
).join('\n')}
`).join('\n')}

To call a function, use this format:
FUNCTION_CALL: function_name
ARGUMENTS: {"param1": "value1", "param2": "value2"}

You can call multiple functions in one response.
`;
}

