import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { useIdeaStore } from '@/stores/ideaStore';
import { sendToGemini } from '@/lib/gemini';
import { hivemind } from '@/lib/orchestrator';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { IdeaWorkspace } from '@/components/IdeaWorkspace';
import { IdeaValidator } from '@/components/IdeaValidator';
import { Button } from '@/components/ui/button';
import { toast } from 'sonner';
import { Lightbulb, Users, Grid3x3 } from 'lucide-react';

export default function Index() {
  const { messages, isLoading, addMessage, setLoading, clearChat } = useChatStore();
  const { getActiveIdea, addContextToIdea } = useIdeaStore();
  const [view, setView] = useState<'chat' | 'ideas' | 'validator'>('chat');
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = async (content: string) => {
    const activeIdea = getActiveIdea();
    
    // Add user message
    addMessage({ 
      role: 'user', 
      content,
      ideaId: activeIdea?.id 
    });
    
    setLoading(true);

    try {
      // Route to appropriate agent
      const routing = hivemind.route(content);
      
      // Build context for agent
      let contextualPrompt = content;
      
      // If there's an active idea, add context
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
      
      // Get response from selected agent
      const response = await sendToGemini(
        contextualPrompt,
        routing.agent.systemPrompt
      );
      
      // Add agent response
      addMessage({ 
        role: 'assistant', 
        content: response,
        agentId: routing.agent.id,
        ideaId: activeIdea?.id 
      });
      
      // Add to idea context if active
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
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border p-4 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-mono font-bold text-primary">NO SHIT</h1>
          <p className="text-xs font-mono text-muted-foreground">
            Multi-agent startup co-pilot
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant={view === 'chat' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setView('chat')}
          >
            <Grid3x3 className="h-4 w-4" />
          </Button>
          <Button 
            variant={view === 'ideas' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setView('ideas')}
          >
            <Lightbulb className="h-4 w-4" />
          </Button>
          <Button 
            variant={view === 'validator' ? 'default' : 'ghost'} 
            size="sm"
            onClick={() => setView('validator')}
          >
            <Users className="h-4 w-4" />
          </Button>
          {view === 'chat' && (
            <Button variant="outline" size="sm" onClick={clearChat}>
              CLEAR
            </Button>
          )}
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 overflow-y-auto p-4">
        {view === 'chat' && (
          <div className="space-y-4">
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
        )}
        
        {view === 'ideas' && <IdeaWorkspace onClose={() => setView('chat')} />}
        {view === 'validator' && <IdeaValidator />}
      </main>

      {/* Footer - only show in chat view */}
      {view === 'chat' && (
        <footer className="border-t border-border p-4">
          <ChatInput onSend={handleSend} disabled={isLoading} />
        </footer>
      )}
    </div>
  );
}
