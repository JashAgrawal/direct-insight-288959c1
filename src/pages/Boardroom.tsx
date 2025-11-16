import { useEffect, useRef, useState } from 'react';
import { AGENTS } from '@/lib/agents';
import { sendToGemini } from '@/lib/gemini';
import { HiveMindOrchestrator } from '@/lib/orchestrator';
import { parseFunctionCalls, executeFunctionCall } from '@/lib/functionCalling';
import { AgentBadge } from '@/components/AgentBadge';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';
import { useIdeaStore } from '@/stores/ideaStore';

interface Decision {
  question: string;
  optionA: string;
  optionB: string;
}

export default function Boardroom() {
  const { getBoardroomMessages, addBoardroomMessage, clearBoardroomChat } = useChatStore();
  const { activeIdeaId } = useIdeaStore();
  const [topic, setTopic] = useState('');
  const [isDebating, setIsDebating] = useState(false);
  const [currentSpeaker, setCurrentSpeaker] = useState<string | null>(null);
  const [pendingDecision, setPendingDecision] = useState<Decision | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Get Boardroom messages for current idea
  const messages = activeIdeaId ? getBoardroomMessages(activeIdeaId) : [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const agentOrder = ['ceo', 'cto', 'cmo', 'cfo', 'pitch', 'legal', 'growth', 'ops'];

  const addMessage = (agentId: string, content: string) => {
    if (!activeIdeaId) {
      toast.error('No active idea selected');
      return;
    }

    addBoardroomMessage(activeIdeaId, {
      role: 'assistant',
      content,
      agentId,
    });
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
    if (!topic.trim()) {
      toast.error('Enter a topic first');
      return;
    }

    if (!activeIdeaId) {
      toast.error('No active idea selected');
      return;
    }

    setIsDebating(true);
    clearBoardroomChat(activeIdeaId);
    setPendingDecision(null);

    try {
      const orchestrator = new HiveMindOrchestrator();
      const boardroomHistory: string[] = [];

      // Step 1: HiveMind decides which agents should participate
      addMessage('hivemind', '🧠 HiveMind analyzing topic and selecting agents...');
      setCurrentSpeaker('hivemind');

      const delegationPrompt = `You are the HiveMind Delegator for a boardroom meeting.

TOPIC: ${topic}

Available agents:
${Object.values(AGENTS)
  .filter(a => a.id !== 'oracle' && a.id !== 'assistant')
  .map(a => `- ${a.name} (${a.id}): ${a.role} - Expertise: ${a.expertise.join(', ')}`)
  .join('\n')}

Select 3-5 agents who should participate in this debate based on the topic.
Return ONLY a JSON array of agent IDs, like: ["ceo", "cto", "cfo"]

Be strategic. Choose agents whose expertise is most relevant to this topic.`;

      const delegationResponse = await sendToGemini(delegationPrompt);
      const jsonMatch = delegationResponse.match(/\[[\s\S]*?\]/);

      let selectedAgents: string[];
      if (jsonMatch) {
        selectedAgents = JSON.parse(jsonMatch[0]);
      } else {
        // Fallback to default agents
        selectedAgents = ['ceo', 'cto', 'cmo', 'cfo'];
      }

      addMessage('hivemind', `Selected agents for debate: ${selectedAgents.map(id => AGENTS[id]?.name || id).join(', ')}`);
      await new Promise((resolve) => setTimeout(resolve, 1000));

      // Step 2: Sequential debate - each agent responds to the previous agent
      for (let i = 0; i < selectedAgents.length; i++) {
        const agentId = selectedAgents[i];
        const agent = AGENTS[agentId];

        if (!agent) continue;

        setCurrentSpeaker(agentId);

        const previousAgent = i > 0 ? AGENTS[selectedAgents[i - 1]] : null;
        const previousMessage = i > 0 ? boardroomHistory[boardroomHistory.length - 1] : null;

        const prompt = `${agent.systemPrompt}

BOARDROOM MEETING TOPIC: ${topic}

${previousAgent && previousMessage ? `
${previousAgent.name} just said:
"${previousMessage}"

Respond to their point. Agree, disagree, build on it, or challenge it.
` : `
You're the first to speak. Set the tone for this discussion.
`}

Full conversation so far:
${boardroomHistory.map((msg, idx) => `${AGENTS[selectedAgents[idx]]?.name}: ${msg}`).join('\n\n')}

Provide your perspective in 2-3 sentences. Be direct, brutal, and focus on your expertise (${agent.role}).`;

        const response = await sendToGemini(prompt);

        addMessage(agentId, response);
        boardroomHistory.push(response);

        await new Promise((resolve) => setTimeout(resolve, 1500));
      }

      // Step 3: Assistant summarizes and creates tasks
      setCurrentSpeaker('assistant');
      const summaryPrompt = `${AGENTS.assistant.systemPrompt}

BOARDROOM MEETING TOPIC: ${topic}

Full debate:
${boardroomHistory.map((msg, idx) => `${AGENTS[selectedAgents[idx]]?.name}: ${msg}`).join('\n\n')}

Your job:
1. Summarize the key points and decisions
2. Extract 3-5 actionable tasks from this discussion
3. Use FUNCTION CALLS to create tasks automatically

For each task, use:
FUNCTION_CALL: create_task
ARGUMENTS: {"title": "Task title", "description": "What needs to be done", "priority": "high", "assignedTo": "cto"}

Be concise. Focus on execution. Create tasks using function calls.`;

      const summary = await sendToGemini(summaryPrompt);
      addMessage('assistant', summary);

      // Parse and execute function calls from Assistant's response
      const functionCalls = parseFunctionCalls(summary);
      let tasksCreated = 0;

      for (const call of functionCalls) {
        const result = executeFunctionCall(call, activeIdeaId);
        if (result.success) {
          tasksCreated++;
          console.log('Task created:', result.result);
        } else {
          console.error('Function call failed:', result.result);
        }
      }

      if (tasksCreated > 0) {
        toast.success(`Boardroom complete. ${tasksCreated} tasks created. Check Tasks tab.`);
      } else {
        toast.success('Boardroom meeting complete.');
      }

    } catch (error) {
      console.error('Boardroom error:', error);
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
