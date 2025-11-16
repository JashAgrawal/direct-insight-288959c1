import { useEffect, useRef } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useIdeaStore } from '@/stores/ideaStore';
import { sendToGemini } from '@/lib/gemini';
import { hivemind } from '@/lib/orchestrator';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';

export default function DashboardHome() {
  const { getHivemindMessages, addHivemindMessage, clearHivemindChat, isLoading, setLoading } = useChatStore();
  const { getActiveIdea, addContextToIdea, activeIdeaId } = useIdeaStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get HiveMind messages for current idea
  const messages = activeIdeaId ? getHivemindMessages(activeIdeaId) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    if (!activeIdeaId) {
      toast.error('No active idea selected');
      return;
    }

    const activeIdea = getActiveIdea();

    addHivemindMessage(activeIdeaId, {
      role: 'user',
      content,
    });

    setLoading(true);

    try {
      // Get chat history for context
      const chatHistory = messages.map(m => ({
        role: m.role,
        content: m.content,
        agentId: m.agentId,
      }));

      // Use AI-powered HiveMind delegator for intelligent routing
      const routing = await hivemind.routeWithAI({
        userMessage: content,
        ideaName: activeIdea?.name,
        ideaDescription: activeIdea?.description,
        chatHistory,
      });

      // Show routing decision to user
      console.log(`🎯 HiveMind Delegator: Routing to ${routing.agent.name} (${routing.confidence.toFixed(2)} confidence) - ${routing.reasoning}`);

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
        routing.agent.systemPrompt
      );

      addHivemindMessage(activeIdeaId, {
        role: 'assistant',
        content: response,
        agentId: routing.agent.id,
      });

      if (activeIdea) {
        addContextToIdea(activeIdea.id, routing.agent.id, response);
      }

    } catch (error) {
      toast.error('Agent offline. Check API configuration.');
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
            <p>AI Delegator routes your questions to the right expert.</p>
            <p className="text-xs">9 agents ready. Ask anything.</p>
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
              🎯 HiveMind Delegator analyzing request...
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
          <Button
            variant="outline"
            size="sm"
            onClick={() => activeIdeaId && clearHivemindChat(activeIdeaId)}
            disabled={!activeIdeaId}
          >
            CLEAR
          </Button>
        </div>
      </div>
    </div>
  );
}
