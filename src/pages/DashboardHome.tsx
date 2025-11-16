import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useIdeaStore } from '@/stores/ideaStore';
import { sendToGemini } from '@/lib/gemini';
import { hivemind } from '@/lib/orchestrator';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DashboardHome() {
  const { messages, apiKey, isLoading, addMessage, setLoading, clearChat } = useChatStore();
  const { getActiveIdea, addContextToIdea } = useIdeaStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!apiKey) {
      toast.error('Set API key first');
      return;
    }

    const activeIdea = getActiveIdea();
    
    addMessage({ 
      role: 'user', 
      content,
      ideaId: activeIdea?.id 
    });
    
    setLoading(true);

    try {
      const routing = hivemind.route(content);
      
      let contextualPrompt = content;
      
      if (activeIdea) {
        const ideaContext = `
ACTIVE IDEA CONTEXT:
Name: ${activeIdea.name}
Description: ${activeIdea.description}
Assigned Agents: ${activeIdea.assignedAgents.join(', ')}

${activeIdea.context.length > 0 ? 'Previous Context:\n' + activeIdea.context.slice(-3).map(c => `- ${c.message}`).join('\n') : ''}

USER QUESTION: ${content}`;
        
        contextualPrompt = ideaContext;
      }
      
      const response = await sendToGemini(
        contextualPrompt,
        apiKey,
        routing.agent.systemPrompt
      );
      
      addMessage({ 
        role: 'assistant', 
        content: response,
        agentId: routing.agent.id,
        ideaId: activeIdea?.id
      });
      
      if (activeIdea) {
        addContextToIdea(activeIdea.id, routing.agent.id, response);
      }
      
    } catch (error) {
      toast.error('Agent offline. Check API key.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6">
        {messages.length === 0 && (
          <div className="text-center text-muted-foreground font-mono text-sm py-12 space-y-4">
            <p className="text-lg font-bold text-primary">🧠 HIVEMIND ACTIVE</p>
            <p>9 agents ready. Ask anything.</p>
            <div className="grid grid-cols-3 gap-2 max-w-md mx-auto text-xs">
              <div className="border border-border p-2">👔 CEO</div>
              <div className="border border-border p-2">⚡ CTO</div>
              <div className="border border-border p-2">🎨 CMO</div>
              <div className="border border-border p-2">💰 CFO</div>
              <div className="border border-border p-2">🎤 Pitch</div>
              <div className="border border-border p-2">⚖️ Legal</div>
              <div className="border border-border p-2">📈 Growth</div>
              <div className="border border-border p-2">🧠 Psych</div>
              <div className="border border-border p-2">🎯 Ops</div>
            </div>
          </div>
        )}
        <div className="space-y-4 max-w-4xl mx-auto">
          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}
          {isLoading && (
            <div className="font-mono text-sm text-muted-foreground animate-pulse">
              HiveMind processing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border p-4">
        <div className="max-w-4xl mx-auto flex gap-2">
          <div className="flex-1">
            <ChatInput onSend={handleSend} disabled={isLoading} />
          </div>
          <Button variant="outline" size="sm" onClick={clearChat}>
            CLEAR
          </Button>
        </div>
      </div>
    </div>
  );
}
