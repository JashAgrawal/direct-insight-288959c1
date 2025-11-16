import { useEffect, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useChatStore } from '@/stores/chatStore';
import { AGENTS } from '@/lib/agents';
import { sendToGemini } from '@/lib/gemini';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { AgentBadge } from '@/components/AgentBadge';

interface LocalMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  agentId?: string;
}

export default function AgentChat() {
  const { agentId } = useParams<{ agentId: string }>();
  const agent = agentId ? AGENTS[agentId] : null;
  const { apiKey } = useChatStore();
  const [messages, setMessages] = useState<LocalMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!apiKey || !agent) {
      toast.error('Agent not available');
      return;
    }

    const userMessage = {
      id: crypto.randomUUID(),
      role: 'user' as const,
      content,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);

    try {
      const response = await sendToGemini(
        content,
        apiKey,
        agent.systemPrompt
      );

      const assistantMessage = {
        id: crypto.randomUUID(),
        role: 'assistant' as const,
        content: response,
        agentId: agent.id,
        timestamp: Date.now(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      toast.error(`${agent.name} is offline. Check API key.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClear = () => {
    setMessages([]);
  };

  if (!agent) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground font-mono">Agent not found</p>
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
