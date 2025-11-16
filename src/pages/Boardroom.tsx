import { useEffect, useRef, useState } from 'react';
import { useChatStore } from '@/stores/chatStore';
import { AGENTS } from '@/lib/agents';
import { sendToGemini } from '@/lib/gemini';
import { AgentBadge } from '@/components/AgentBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface BoardroomMessage {
  id: string;
  agentId: string;
  content: string;
  timestamp: number;
}

interface Decision {
  question: string;
  optionA: string;
  optionB: string;
}

export default function Boardroom() {
  const { apiKey } = useChatStore();
  const [topic, setTopic] = useState('');
  const [messages, setMessages] = useState<BoardroomMessage[]>([]);
  const [isDebating, setIsDebating] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const agentOrder = ['ceo', 'cto', 'cmo', 'cfo', 'pitch', 'legal', 'growth', 'ops'];

  const addMessage = (agentId: string, content: string) => {
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        agentId,
        content,
        timestamp: Date.now(),
      },
    ]);
  };

  const checkForDecision = (response: string): Decision | null => {
    if (response.toLowerCase().includes('decision required') || 
        response.toLowerCase().includes('choose between')) {
      const lines = response.split('\n');
      const questionLine = lines.find(l => l.includes('?')) || 'Make a choice:';
      const optionALine = lines.find(l => l.toLowerCase().includes('option a')) || 'Option A';
      const optionBLine = lines.find(l => l.toLowerCase().includes('option b')) || 'Option B';
      
      return {
        question: questionLine,
        optionA: optionALine,
        optionB: optionBLine,
      };
    }
    return null;
  };

  const startDebate = async () => {
    if (!apiKey || !topic.trim()) {
      toast.error('Enter a topic first');
      return;
    }

    setIsDebating(true);
    setMessages([]);
    setPendingDecision(null);

    try {
      let conversationHistory = `BOARDROOM TOPIC: ${topic}\n\n`;
      
      for (let i = 0; i < agentOrder.length; i++) {
        const agentId = agentOrder[i];
        const agent = AGENTS[agentId];
        
        setCurrentSpeaker(agentId);

        const prompt = `${agent.systemPrompt}

BOARDROOM MEETING TOPIC: ${topic}

Previous discussion:
${conversationHistory}

Provide your perspective on this topic in 2-3 sentences. Be direct and focus on your area of expertise (${agent.role}).

If you believe a critical decision needs to be made, format your response as:
DECISION REQUIRED: [Question]
Option A: [First choice]
Option B: [Second choice]`;

        const response = await sendToGemini(prompt, apiKey);
        
        addMessage(agentId, response);
        conversationHistory += `${agent.name}: ${response}\n\n`;

        const decision = checkForDecision(response);
        if (decision) {
          setPendingDecision(decision);
          setIsDebating(false);
          setCurrentSpeaker(null);
          return;
        }

        await new Promise((resolve) => setTimeout(resolve, 1000));
      }

      // Final CEO summary
      setCurrentSpeaker('ceo');
      const summaryPrompt = `${AGENTS.ceo.systemPrompt}

You've just heard from all department heads about: ${topic}

Conversation:
${conversationHistory}

Provide a final executive summary and decision in 3-4 sentences. Use "TRANSMISSION END" to close the meeting.`;

      const summary = await sendToGemini(summaryPrompt, apiKey);
      addMessage('ceo', summary);

    } catch (error) {
      toast.error('Boardroom connection failed');
    } finally {
      setIsDebating(false);
      setCurrentSpeaker(null);
    }
  };

  const handleDecision = async (choice: 'A' | 'B') => {
    if (!pendingDecision) return;

    const chosenOption = choice === 'A' ? pendingDecision.optionA : pendingDecision.optionB;
    
    addMessage('user', `FOUNDER DECISION: ${choice} - ${chosenOption}`);
    
    setPendingDecision(null);
    
    toast.success('Decision recorded. Agents will proceed.');
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-5xl mx-auto space-y-6">
          {/* Header */}
          <div className="border border-border p-6 space-y-4">
            <h1 className="text-2xl font-mono font-bold text-primary">🏛️ BOARDROOM</h1>
            <p className="text-sm font-mono text-muted-foreground">
              Agents debate. HiveMind orchestrates. You decide.
            </p>

            <div className="space-y-2">
              <label className="text-xs font-mono text-muted-foreground">MEETING TOPIC</label>
              <Textarea
                value={topic}
                onChange={(e) => setTopic(e.target.value)}
                placeholder="Enter the topic for boardroom discussion..."
                className="font-mono text-sm"
                disabled={isDebating}
              />
            </div>

            <Button
              onClick={startDebate}
              disabled={isDebating || !topic.trim()}
              className="w-full"
            >
              {isDebating ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  DEBATE IN PROGRESS
                </>
              ) : (
                'START BOARDROOM MEETING'
              )}
            </Button>
          </div>

          {/* Messages */}
          {messages.length > 0 && (
            <div className="space-y-4">
              {messages.map((message) => {
                const agent = AGENTS[message.agentId];
                if (!agent) return null;

                return (
                  <div key={message.id} className="border border-border p-4 space-y-2">
                    <div className="flex items-center gap-2">
                      <AgentBadge agentId={message.agentId} />
                      {currentSpeaker === message.agentId && (
                        <span className="text-xs font-mono text-accent animate-pulse">
                          SPEAKING...
                        </span>
                      )}
                    </div>
                    <p className="text-sm font-mono whitespace-pre-wrap">{message.content}</p>
                  </div>
                );
              })}
            </div>
          )}

          {/* Decision Prompt */}
          {pendingDecision && (
            <div className="border-2 border-primary p-6 space-y-4 animate-pulse">
              <h3 className="text-lg font-mono font-bold text-primary">
                ⚠️ FOUNDER DECISION REQUIRED
              </h3>
              <p className="text-sm font-mono">{pendingDecision.question}</p>
              <div className="grid grid-cols-2 gap-4">
                <Button
                  onClick={() => handleDecision('A')}
                  variant="outline"
                  className="h-auto py-4"
                >
                  <div className="text-left">
                    <p className="font-bold">OPTION A</p>
                    <p className="text-xs">{pendingDecision.optionA}</p>
                  </div>
                </Button>
                <Button
                  onClick={() => handleDecision('B')}
                  variant="outline"
                  className="h-auto py-4"
                >
                  <div className="text-left">
                    <p className="font-bold">OPTION B</p>
                    <p className="text-xs">{pendingDecision.optionB}</p>
                  </div>
                </Button>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>
      </div>
    </div>
  );
}
