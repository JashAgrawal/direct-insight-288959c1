import { useState } from 'react';
import { useIdeaStore } from '@/stores/ideaStore';
import { useTaskStore, Task } from '@/stores/taskStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { AGENTS } from '@/lib/agents';
import { CheckCircle2, Circle, Clock, AlertCircle, Trash2, Plus } from 'lucide-react';

export default function Tasks() {
  const { activeIdeaId } = useIdeaStore();
  const { getTasksByIdea, updateTask, deleteTask } = useTaskStore();
  const [filter, setFilter] = useState<'all' | Task['status']>('all');

  if (!activeIdeaId) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground font-mono">No active idea selected</p>
      </div>
    );
  }

  const allTasks = getTasksByIdea(activeIdeaId);
  const tasks = filter === 'all'
    ? allTasks
    : allTasks.filter(t => t.status === filter);

  const getStatusIcon = (status: Task['status']) => {
    switch (status) {
      case 'done':
        return <CheckCircle2 className="h-4 w-4 text-green-500" />;
      case 'in-progress':
        return <Clock className="h-4 w-4 text-blue-500" />;
      case 'blocked':
        return <AlertCircle className="h-4 w-4 text-red-500" />;
      default:
        return <Circle className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getStatusColor = (status: Task['status']) => {
    switch (status) {
      case 'done':
        return 'bg-green-500/10 text-green-500 border-green-500/50';
      case 'in-progress':
        return 'bg-blue-500/10 text-blue-500 border-blue-500/50';
      case 'blocked':
        return 'bg-red-500/10 text-red-500 border-red-500/50';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const getPriorityColor = (priority: Task['priority']) => {
    switch (priority) {
      case 'urgent':
        return 'bg-red-500/10 text-red-500 border-red-500/50';
      case 'high':
        return 'bg-orange-500/10 text-orange-500 border-orange-500/50';
      case 'medium':
        return 'bg-yellow-500/10 text-yellow-500 border-yellow-500/50';
      default:
        return 'bg-muted text-muted-foreground border-border';
    }
  };

  const statusCounts = {
    all: allTasks.length,
    todo: allTasks.filter(t => t.status === 'todo').length,
    'in-progress': allTasks.filter(t => t.status === 'in-progress').length,
    done: allTasks.filter(t => t.status === 'done').length,
    blocked: allTasks.filter(t => t.status === 'blocked').length,
  };

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-mono font-bold text-primary">📋 TASKS</h1>
          <p className="text-sm font-mono text-muted-foreground mt-1">
            Track progress. Get shit done.
          </p>
        </div>
        <Button className="font-mono">
          <Plus className="mr-2 h-4 w-4" />
          NEW TASK
        </Button>
      </div>

      {/* Filters */}
      <div className="flex gap-2 flex-wrap">
        <Button
          variant={filter === 'all' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('all')}
          className="font-mono"
        >
          ALL ({statusCounts.all})
        </Button>
        <Button
          variant={filter === 'todo' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('todo')}
          className="font-mono"
        >
          TODO ({statusCounts.todo})
        </Button>
        <Button
          variant={filter === 'in-progress' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('in-progress')}
          className="font-mono"
        >
          IN PROGRESS ({statusCounts['in-progress']})
        </Button>
        <Button
          variant={filter === 'done' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('done')}
          className="font-mono"
        >
          DONE ({statusCounts.done})
        </Button>
        <Button
          variant={filter === 'blocked' ? 'default' : 'outline'}
          size="sm"
          onClick={() => setFilter('blocked')}
          className="font-mono"
        >
          BLOCKED ({statusCounts.blocked})
        </Button>
      </div>

      {/* Tasks List */}
      {tasks.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <p className="font-mono text-muted-foreground">
              {filter === 'all'
                ? 'No tasks yet. Assistant will create them automatically, or you can add manually.'
                : `No ${filter} tasks.`}
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-3">
          {tasks.map((task) => {
            const agent = task.assignedTo ? AGENTS[task.assignedTo] : null;

            return (
              <Card key={task.id} className="hover:border-primary/50 transition-colors">
                <CardContent className="p-4">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-2">
                      {/* Title and Description */}
                      <div className="flex items-start gap-3">
                        <div className="mt-1">{getStatusIcon(task.status)}</div>
                        <div className="flex-1">
                          <h3 className="font-mono font-semibold text-sm">{task.title}</h3>
                          <p className="text-xs font-mono text-muted-foreground mt-1">
                            {task.description}
                          </p>
                        </div>
                      </div>

                      {/* Metadata */}
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant="outline" className={`font-mono text-xs ${getStatusColor(task.status)}`}>
                          {task.status.toUpperCase()}
                        </Badge>
                        <Badge variant="outline" className={`font-mono text-xs ${getPriorityColor(task.priority)}`}>
                          {task.priority.toUpperCase()}
                        </Badge>
                        {agent && (
                          <Badge variant="outline" className="font-mono text-xs">
                            {agent.emoji} {agent.name}
                          </Badge>
                        )}
                        {task.tags?.map((tag) => (
                          <Badge key={tag} variant="outline" className="font-mono text-xs">
                            #{tag}
                          </Badge>
                        ))}
                      </div>
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-2">
                      {task.status !== 'done' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateTask(task.id, { status: 'done' })}
                          className="font-mono text-xs"
                        >
                          <CheckCircle2 className="h-3 w-3 mr-1" />
                          DONE
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteTask(task.id)}
                        className="text-destructive hover:text-destructive"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}

