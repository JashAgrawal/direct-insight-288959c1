import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdeaStore } from '@/stores/ideaStore';
import { useChatStore } from '@/stores/chatStore';
import { sendToGemini } from '@/lib/gemini';
import { AGENTS } from '@/lib/agents';
import { Button } from '@/components/ui/button';
import { ChatMessage } from '@/components/ChatMessage';
import { ChatInput } from '@/components/ChatInput';
import { toast } from 'sonner';
import { Loader2, ArrowLeft, CheckCircle2, XCircle } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';

export default function OracleChat() {
  const navigate = useNavigate();
  const { getActiveIdea, updateIdea, activeIdeaId } = useIdeaStore();
  const { getOracleMessages, addOracleMessage, isLoading, setLoading } = useChatStore();
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [conversationTurns, setConversationTurns] = useState(0);

  const currentIdea = getActiveIdea();
  const currentIdeaId = activeIdeaId;
  const currentVerdict = currentIdea?.verdict || null;
  const messages = currentIdeaId ? getOracleMessages(currentIdeaId) : [];

  // Redirect if no active idea
  useEffect(() => {
    if (!currentIdeaId) {
      navigate('/analyze-ideas');
    }
  }, [currentIdeaId, navigate]);

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages.length]);

  // Count conversation turns (user messages)
  useEffect(() => {
    const userMessages = messages.filter(m => m.role === 'user');
    setConversationTurns(userMessages.length);
  }, [messages]);

  const handleChatMessage = async (content: string) => {
    if (!currentIdeaId) return;

    addOracleMessage(currentIdeaId, {
      role: 'user',
      content,
    });

    setLoading(true);

    try {
      const conversationHistory = messages
        .map(m => `${m.role === 'user' ? 'USER' : 'ORACLE'}: ${m.content}`)
        .join('\n\n');

      // After 3+ turns, Oracle should make a decision
      const shouldJudge = conversationTurns >= 2; // 3rd turn (0-indexed)

      const oraclePrompt = shouldJudge
        ? `${AGENTS.oracle.systemPrompt}

CONVERSATION HISTORY:
${conversationHistory}

USER'S LATEST MESSAGE:
${content}

INSTRUCTIONS:
You've asked enough questions. It's time to make a FINAL VERDICT.

Evaluate this idea based on the conversation. Score each 1-10 (be strict, average ideas get 5-6):

1. PROBLEM CLARITY (1-10): Is the problem clearly defined? Is it urgent? Do people actually care?
2. MARKET SIZE (1-10): Is the addressable market large enough? Is there real demand?
3. UNIQUENESS (1-10): Is this differentiated? What's the competitive moat?
4. BUSINESS MODEL (1-10): How does money work? Is it sustainable and scalable?
5. EXECUTION FEASIBILITY (1-10): Can this actually be built? What are the blockers?

CALCULATE TOTAL SCORE (sum of all 5 criteria, max 50).

VERDICT RULES (STRICT):
- TRASH: Score < 20. Fundamentally flawed. Flow ends. Nothing unlocked.
- MID: Score 20-34. Weak but salvageable. Give hints. Keep locked.
- VIABLE: Score 35-44. Solid fundamentals. Unlock full system.
- FIRE: Score 45+. Exceptional. Unlock full system.

Provide your evaluation in this EXACT format:
VERDICT: [TRASH/MID/VIABLE/FIRE]
SCORE: [total]/50
BREAKDOWN: Problem: [score]/10, Market: [score]/10, Uniqueness: [score]/10, Business: [score]/10, Execution: [score]/10
FEEDBACK: [brutal, direct analysis]

If TRASH: "Idea rejected. Try again or go cry."
If MID: "Improve this garbage and come back." + IMPROVEMENTS: [specific things to fix]
If VIABLE/FIRE: FINAL_IDEA_NAME: [refined name] + FINAL_IDEA_DESCRIPTION: [refined description]

Be consistent. Same idea should get same verdict.`
        : `${AGENTS.oracle.systemPrompt}

CONVERSATION HISTORY:
${conversationHistory}

USER'S LATEST MESSAGE:
${content}

INSTRUCTIONS:
Continue asking clarifying questions. You still need more information to make a proper judgment.

Focus on areas that are still unclear:
- Problem definition and urgency
- Target market and demand
- Competitive differentiation
- Business model and monetization
- Execution feasibility and risks

Ask 1-2 more pointed questions. Be brutal and direct.

DO NOT provide a verdict yet. Keep gathering information.`;

      const response = await sendToGemini(oraclePrompt);

      addOracleMessage(currentIdeaId, {
        role: 'assistant',
        content: response,
        agentId: 'oracle',
      });

      // Check for verdict
      const verdictMatch = response.match(/VERDICT:\s*(TRASH|MID|VIABLE|FIRE)/i);
      if (verdictMatch) {
        const verdict = verdictMatch[1].toUpperCase() as 'TRASH' | 'MID' | 'VIABLE' | 'FIRE';
        updateIdea(currentIdeaId, { verdict });

        // Extract refined name and description if VIABLE/FIRE
        if (verdict === 'VIABLE' || verdict === 'FIRE') {
          const nameMatch = response.match(/FINAL_IDEA_NAME:\s*(.+?)(?:\n|$)/i);
          const descMatch = response.match(/FINAL_IDEA_DESCRIPTION:\s*([\s\S]+?)(?:\n(?:FEEDBACK|VERDICT|SCORE):|$)/i);

          if (nameMatch || descMatch) {
            updateIdea(currentIdeaId, {
              name: nameMatch ? nameMatch[1].trim() : currentIdea?.name,
              description: descMatch ? descMatch[1].trim() : currentIdea?.description,
              validated: true,
            });
          }

          toast.success(`${verdict}! Idea approved. Proceed to dashboard.`);
        } else if (verdict === 'TRASH') {
          toast.error('Idea rejected. Try a better idea.');
        } else if (verdict === 'MID') {
          toast.warning('Needs improvement.');
        }
      }

    } catch (error) {
      toast.error('Oracle is offline. Check API configuration.');
    } finally {
      setLoading(false);
    }
  };

  if (!currentIdea) return null;

  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b border-border p-4">
        <div className="max-w-4xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="sm" onClick={() => navigate('/analyze-ideas')}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <div className="text-2xl">👔</div>
            <div>
              <h1 className="text-xl font-mono font-bold text-primary">ORACLE INTERROGATION</h1>
              <p className="text-xs font-mono text-muted-foreground">
                {currentIdea.name}
                {currentVerdict && (
                  <span className="ml-2">
                    {currentVerdict === 'FIRE' && <span className="text-orange-500">🔥 FIRE</span>}
                    {currentVerdict === 'VIABLE' && <span className="text-green-500">✓ VIABLE</span>}
                    {currentVerdict === 'MID' && <span className="text-yellow-500">⚠ MID</span>}
                    {currentVerdict === 'TRASH' && <span className="text-red-500">✗ TRASH</span>}
                  </span>
                )}
              </p>
            </div>
          </div>
          {(currentVerdict === 'VIABLE' || currentVerdict === 'FIRE') && (
            <Button onClick={() => navigate('/dashboard')} className="font-mono">
              PROCEED TO DASHBOARD
            </Button>
          )}
        </div>
      </div>

      {/* Chat Area */}
      <div className="flex-1 overflow-y-auto p-6">
        <div className="max-w-4xl mx-auto space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground font-mono text-sm py-12">
              <p className="text-lg font-bold text-primary mb-2">👔 ORACLE ACTIVE</p>
              <p>Answer the Oracle's questions honestly. Your idea's fate depends on it.</p>
            </div>
          )}

          {messages.map((message) => (
            <ChatMessage key={message.id} message={message} />
          ))}

          {isLoading && (
            <div className="font-mono text-sm text-muted-foreground animate-pulse flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" />
              Oracle is analyzing...
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input */}
      <div className="border-t border-border p-4">
        <div className="max-w-4xl mx-auto">
          {currentVerdict === 'MID' && (
            <div className="mb-2">
              <Card className="border-yellow-500/50 bg-yellow-500/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-yellow-500 font-mono text-xs">
                    <XCircle className="h-3 w-3" />
                    <span>Idea needs improvement. Answer the Oracle's questions to refine it.</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {(currentVerdict === 'VIABLE' || currentVerdict === 'FIRE') && (
            <div className="mb-2">
              <Card className="border-green-500/50 bg-green-500/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-green-500 font-mono text-xs">
                    <CheckCircle2 className="h-3 w-3" />
                    <span>System unlocked. Click "PROCEED TO DASHBOARD" to access the AI boardroom.</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          {currentVerdict === 'TRASH' && (
            <div className="mb-2">
              <Card className="border-red-500/50 bg-red-500/5">
                <CardContent className="p-3">
                  <div className="flex items-center gap-2 text-red-500 font-mono text-xs">
                    <XCircle className="h-3 w-3" />
                    <span>Idea rejected. You can continue discussing, but the Oracle has spoken.</span>
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
          <ChatInput onSend={handleChatMessage} disabled={isLoading} />
          <p className="text-xs font-mono text-muted-foreground text-center mt-2">
            Turn {conversationTurns + 1} • Oracle will judge after {Math.max(0, 3 - conversationTurns)} more {Math.max(0, 3 - conversationTurns) === 1 ? 'turn' : 'turns'}
          </p>
        </div>
      </div>
    </div>
  );
}

