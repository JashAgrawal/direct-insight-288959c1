import { useEffect, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { AGENTS } from '@/lib/agents';
import { sendToGemini } from '@/lib/gemini';
import { parseFunctionCalls, executeFunctionCall } from '@/lib/functionCalling';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AgentBadge } from '@/components/AgentBadge';
import { useChatStore } from '@/stores/chatStore';
import { useIdeaStore } from '@/stores/ideaStore';

export default function AgentChat() {
  const { agentId } = useParams<{ agentId: string }>();
  const agent = agentId ? AGENTS[agentId] : null;
  const { activeIdeaId } = useIdeaStore();
  const {
    getAgentMessages,
    addAgentMessage,
    clearAgentChat,
    isLoading,
    setLoading,
    getSharedContext,
    getAssistantContext
  } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const messages = activeIdeaId && agentId ? getAgentMessages(activeIdeaId, agentId) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!agent || !activeIdeaId) {
      toast.error('Agent not available or no active idea');
      return;
    }

    // Add user message
    addAgentMessage(activeIdeaId, agent.id, {
      role: 'user',
      content,
    });

    setLoading(true);

    try {
      // Build context based on agent type
      let contextualPrompt = content;

      // Assistant gets access to EVERYTHING
      if (agent.id === 'assistant') {
        const fullContext = getAssistantContext(activeIdeaId);

        const contextSummary = `
FULL CONTEXT ACCESS (Assistant Only):

ORACLE CONVERSATIONS:
${fullContext.oracle.slice(-5).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

AGENT CONVERSATIONS:
${Object.entries(fullContext.agents).map(([agId, msgs]) => {
  const agentName = AGENTS[agId]?.name || agId;
  return `${agentName}:\n${msgs.slice(-3).map(m => `  ${m.role.toUpperCase()}: ${m.content}`).join('\n')}`;
}).join('\n\n')}

HIVEMIND DISCUSSIONS:
${fullContext.hivemind.slice(-5).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

BOARDROOM MEETINGS:
${fullContext.boardroom.slice(-5).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

USER'S CURRENT QUESTION: ${content}`;

        contextualPrompt = contextSummary;
      } else {
        // Regular agents only get shared context (HiveMind + Boardroom)
        const sharedContext = getSharedContext(activeIdeaId);

        if (sharedContext.hivemind.length > 0 || sharedContext.boardroom.length > 0) {
          const contextSummary = `
SHARED CONTEXT (HiveMind + Boardroom):

HIVEMIND DISCUSSIONS:
${sharedContext.hivemind.slice(-5).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

BOARDROOM MEETINGS:
${sharedContext.boardroom.slice(-5).map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n\n')}

USER'S CURRENT QUESTION: ${content}`;

          contextualPrompt = contextSummary;
        }
      }

      const response = await sendToGemini(
        contextualPrompt,
        agent.systemPrompt
      );

      addAgentMessage(activeIdeaId, agent.id, {
        role: 'assistant',
        content: response,
        agentId: agent.id,
      });

      // If this is the Assistant agent, parse and execute function calls
      if (agent.id === 'assistant') {
        const functionCalls = parseFunctionCalls(response);
        let tasksCreated = 0;

        for (const call of functionCalls) {
          const result = executeFunctionCall(call, activeIdeaId);
          if (result.success) {
            tasksCreated++;
            console.log('Task created by Assistant:', result.result);
          } else {
            console.error('Function call failed:', result.result);
          }
        }

        if (tasksCreated > 0) {
          toast.success(`${tasksCreated} task${tasksCreated > 1 ? 's' : ''} created. Check Tasks tab.`);
        }
      }
    } catch (error) {
      toast.error(`${agent.name} is offline. Check API configuration.`);
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    if (activeIdeaId && agentId) {
      clearAgentChat(activeIdeaId, agentId);
    }
  };

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground font-mono">Agent not found</p>
      </div>
    );
  }

  if (!activeIdeaId) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center space-y-4">
          <div className="text-6xl mb-4">{agent.emoji}</div>
          <h2 className="text-2xl font-mono font-bold text-primary">{agent.name}</h2>
          <p className="text-sm font-mono text-muted-foreground">
            No active idea selected. Please select or create an idea first.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="text-center py-12 space-y-4 max-w-2xl mx-auto">
            <div className="text-6xl mb-4">{agent.emoji}</div>
            <h2 className="text-2xl font-mono font-bold text-primary">{agent.name}</h2>
            <p className="text-sm font-mono text-muted-foreground">{agent.role}</p>
            <div className="border border-border p-4 text-left">
              <p className="text-xs font-mono text-muted-foreground mb-2">EXPERTISE:</p>
              <div className="flex flex-wrap gap-2">
                {agent.expertise.map((exp) => (
                  <span key={exp} className="text-xs font-mono bg-muted px-2 py-1">
                    {exp}
                  </span>
                ))}
              </div>
            </div>
            <p className="text-sm font-mono text-muted-foreground">
              Direct line to {agent.name}. Ask anything about {agent.expertise[0]}.
            </p>
          </div>
        )}
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="font-mono text-sm text-muted-foreground animate-pulse flex items-center gap-2">
              <AgentBadge agentId={agent.id} />
              <span>{agent.name} thinking...</span>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <div className="flex-1">
            <ChatInput 
              onSend={handleSend} 
              disabled={isLoading}
            />
          </div>
          <Button variant="outline" size="sm" onClick={handleClear}>
            CLEAR
          </Button>
        </div>
      </div>
    </div>
  );
}
