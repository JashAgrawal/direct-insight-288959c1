import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useIdeaStore } from '@/stores/ideaStore';
import { sendToGemini } from '@/lib/gemini';
import { AGENTS } from '@/lib/agents';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { toast } from 'sonner';
import { Loader2, XCircle, Sparkles, List, ExternalLink } from 'lucide-react';
import { useChatStore } from '@/stores/chatStore';

export default function Landing() {
  const navigate = useNavigate();
  const { ideas, createIdea, updateIdea, setActiveIdea } = useIdeaStore();
  const { addOracleMessage, setLoading } = useChatStore();
  const [initialIdea, setInitialIdea] = useState('');
  const [isSubmittingIdea, setIsSubmittingIdea] = useState(false);

  const handleInitialSubmit = async () => {
    if (!initialIdea.trim()) {
      toast.error('Please enter your startup idea');
      return;
    }

    setIsSubmittingIdea(true);

    try {
      // Create idea immediately
      const ideaId = createIdea({
        name: initialIdea.split('\n')[0].substring(0, 50) || 'New Idea',
        description: initialIdea,
        assignedAgents: ['oracle'],
      });

      // Add user's initial idea as a message
      addOracleMessage(ideaId, {
        role: 'user',
        content: initialIdea,
      });

      setLoading(true);

      // Oracle's initial response - ASK QUESTIONS instead of immediate judgment
      const oraclePrompt = `${AGENTS.oracle.systemPrompt}

USER'S INITIAL IDEA:
${initialIdea}

INSTRUCTIONS:
This is the user's initial idea submission. DO NOT judge it yet. You need to gather more information first.

Your job is to ask clarifying questions to understand:
1. PROBLEM: What specific problem does this solve? Who has this problem? How painful is it?
2. MARKET: Who are the target customers? How big is the market? What's the demand?
3. UNIQUENESS: What makes this different from existing solutions? What's the competitive advantage?
4. BUSINESS MODEL: How will this make money? What's the pricing? What are the unit economics?
5. EXECUTION: What's the MVP? What are the technical requirements? What are the biggest risks?

Ask 2-3 pointed, brutal questions to dig deeper. Be direct. No fluff.

Example questions:
- "Who exactly is paying for this? And why would they pay YOU instead of [competitor]?"
- "What's stopping someone with more money from copying this in 6 months?"
- "How are you going to get your first 100 customers without a marketing budget?"
- "What's the actual problem here? Because this sounds like a solution looking for a problem."

DO NOT provide a verdict yet. Just ask questions.
DO NOT use the VERDICT format yet.
Just have a conversation to gather information.`;

      const response = await sendToGemini(oraclePrompt);

      addOracleMessage(ideaId, {
        role: 'assistant',
        content: response,
        agentId: 'oracle',
      });

      // Set as active idea and navigate to Oracle chat to continue conversation
      setActiveIdea(ideaId);
      setInitialIdea('');
      toast.success('Oracle is asking questions. Answer them honestly.');
      navigate('/oracle-chat');

    } catch (error) {
      toast.error('Oracle is offline. Check API configuration.');
    } finally {
      setIsSubmittingIdea(false);
      setLoading(false);
    }
  };



  // Simple landing page - always show textarea + buttons
  return (
    <div className="min-h-screen flex items-center justify-center p-4">
      <div className="max-w-3xl w-full space-y-8">
        {/* Hero Section */}
        <div className="text-center space-y-4">
          <h1 className="text-6xl font-mono font-bold text-primary mb-4">
            NO SHIT
          </h1>
          <p className="text-2xl font-mono text-foreground">
            Submit your idea to the Oracle.
          </p>
          <p className="text-lg font-mono text-muted-foreground">
            Only the strongest ideas survive.
          </p>
        </div>

        {/* Idea Input */}
        <div className="border border-border p-8 space-y-6">
          <div className="space-y-2">
            <label className="text-sm font-mono text-muted-foreground block">
              YOUR STARTUP IDEA
            </label>
            <Textarea
              value={initialIdea}
              onChange={(e) => setInitialIdea(e.target.value)}
              placeholder="Describe your startup idea. Be specific. The Oracle doesn't waste time on vague pitches."
              className="font-mono text-sm min-h-[200px] resize-none"
              disabled={isSubmittingIdea}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  handleInitialSubmit();
                }
              }}
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={handleInitialSubmit}
              disabled={isSubmittingIdea || !initialIdea.trim()}
              className="text-lg py-6"
              size="lg"
            >
              {isSubmittingIdea ? (
                <>
                  <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                  ANALYZING...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-5 w-5" />
                  ANALYZE IDEA
                </>
              )}
            </Button>

            <Button
              onClick={() => navigate('/analyze-ideas')}
              variant="outline"
              className="text-lg py-6"
              size="lg"
            >
              <List className="mr-2 h-5 w-5" />
              VIEW MY IDEAS
            </Button>
          </div>

          <p className="text-xs font-mono text-muted-foreground text-center">
            Press Cmd/Ctrl + Enter to analyze. The Oracle will judge your idea.
          </p>
        </div>

        {/* Footer Info */}
        <div className="grid grid-cols-3 gap-4 text-center">
          <div className="border border-border p-4">
            <p className="text-2xl font-bold text-primary">9</p>
            <p className="text-xs font-mono text-muted-foreground">AI Agents</p>
          </div>
          <div className="border border-border p-4">
            <p className="text-2xl font-bold text-accent">100%</p>
            <p className="text-xs font-mono text-muted-foreground">Brutal Honesty</p>
          </div>
          <div className="border border-border p-4">
            <p className="text-2xl font-bold text-foreground">0</p>
            <p className="text-xs font-mono text-muted-foreground">Bullshit</p>
          </div>
        </div>

        {/* Idea Graveyard - Show rejected ideas */}
        {ideas.filter(i => i.verdict === 'TRASH' || i.verdict === 'MID').length > 0 && (
          <div className="border border-red-500/30 p-6 space-y-4 bg-red-500/5">
            <div className="flex items-center gap-2">
              <XCircle className="h-5 w-5 text-red-500" />
              <h2 className="text-xl font-mono font-bold text-red-500">IDEA GRAVEYARD</h2>
            </div>
            <p className="text-sm font-mono text-muted-foreground">
              Your past failures. Learn from them.
            </p>
            <div className="space-y-2">
              {ideas
                .filter(i => i.verdict === 'TRASH' || i.verdict === 'MID')
                .slice(-5) // Show last 5 rejected ideas
                .map((idea) => (
                  <div
                    key={idea.id}
                    className="border border-border p-3 bg-background/50 hover:bg-background transition-colors cursor-pointer"
                    onClick={() => navigate('/analyze-ideas')}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          {idea.verdict === 'TRASH' ? (
                            <span className="text-xs font-mono font-bold text-red-500">🗑️ TRASH</span>
                          ) : (
                            <span className="text-xs font-mono font-bold text-yellow-500">⚠️ MID</span>
                          )}
                          <span className="text-xs font-mono text-muted-foreground">
                            {new Date(idea.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                        <p className="text-sm font-mono font-bold">{idea.name}</p>
                        <p className="text-xs font-mono text-muted-foreground line-clamp-2 mt-1">
                          {idea.description}
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
            {ideas.filter(i => i.verdict === 'TRASH' || i.verdict === 'MID').length > 5 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate('/analyze-ideas')}
                className="w-full font-mono text-xs"
              >
                VIEW ALL REJECTED IDEAS
              </Button>
            )}
          </div>
        )}

        {/* Footer - Built by */}
        <div className="border-t border-border pt-6 mt-8">
          <div className="flex items-center justify-center gap-2 text-sm font-mono text-muted-foreground">
            <span>Built by</span>
            <a
              href="https://jashagrawal.in/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:underline font-bold inline-flex items-center gap-1"
            >
              Jash Agrawal
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
          <div className="flex items-center justify-center gap-4 mt-3">
            <a
              href="https://jashagrawal.in/github"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              GitHub
              <ExternalLink className="h-3 w-3" />
            </a>
            <span className="text-muted-foreground">•</span>
            <a
              href="https://jashagrawal.in/linkedin"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-muted-foreground hover:text-primary transition-colors inline-flex items-center gap-1"
            >
              LinkedIn
              <ExternalLink className="h-3 w-3" />
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
