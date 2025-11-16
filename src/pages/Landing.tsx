import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '@/stores/authStore';
import { useChatStore } from '@/stores/chatStore';
import { sendToGemini } from '@/lib/gemini';
import { AGENTS } from '@/lib/agents';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();
  const { setApproved } = useAuthStore();
  const { apiKey, setApiKey } = useChatStore();
  const [tempKey, setTempKey] = useState('');
  const [idea, setIdea] = useState('');
  const [isValidating, setIsValidating] = useState(false);

  const handleSubmit = async () => {
    if (!apiKey) {
      toast.error('Please set your API key first');
      return;
    }
    
    if (!idea.trim()) {
      toast.error('Please enter your startup idea');
      return;
    }

    setIsValidating(true);

    try {
      const oraclePrompt = `${AGENTS.ceo.systemPrompt}

USER IDEA: ${idea}

Evaluate this startup idea brutally. If it has potential, respond with "APPROVED:" followed by your analysis. If it's weak, respond with "REJECTED:" followed by why it won't work. Be direct and honest.`;

      const response = await sendToGemini(oraclePrompt, apiKey);

      if (response.toLowerCase().includes('approved')) {
        setApproved(idea, response);
        toast.success('Oracle approved your idea!');
        navigate('/dashboard');
      } else {
        toast.error('Oracle rejected your idea. Try again with a better pitch.');
      }
    } catch (error) {
      toast.error('Oracle is offline. Check your API key.');
    } finally {
      setIsValidating(false);
    }
  };

  if (!apiKey) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-6 border border-border p-8">
          <div>
            <h1 className="text-3xl font-mono font-bold text-primary mb-2">NO SHIT</h1>
            <p className="text-sm font-mono text-muted-foreground">
              Brutally honest Oracle for founders.
            </p>
          </div>
          <div className="space-y-4">
            <div>
              <label className="text-xs font-mono text-muted-foreground block mb-2">
                GEMINI API KEY
              </label>
              <Input
                type="password"
                value={tempKey}
                onChange={(e) => setTempKey(e.target.value)}
                placeholder="Enter API key..."
                className="font-mono text-sm"
              />
            </div>
            <Button
              onClick={() => {
                if (tempKey.trim()) {
                  setApiKey(tempKey.trim());
                }
              }}
              disabled={!tempKey.trim()}
              className="w-full"
            >
              INITIALIZE
            </Button>
            <a
              href="https://makersuite.google.com/app/apikey"
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs font-mono text-accent hover:underline block text-center"
            >
              Get API key →
            </a>
          </div>
        </div>
      </div>
    );
  }

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
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              placeholder="Describe your startup idea. Be specific. The Oracle doesn't waste time on vague pitches."
              className="font-mono text-sm min-h-[200px] resize-none"
              disabled={isValidating}
            />
          </div>

          <Button
            onClick={handleSubmit}
            disabled={isValidating || !idea.trim()}
            className="w-full text-lg py-6"
            size="lg"
          >
            {isValidating ? (
              <>
                <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                ORACLE DELIBERATING...
              </>
            ) : (
              'SUBMIT TO ORACLE'
            )}
          </Button>

          <p className="text-xs font-mono text-muted-foreground text-center">
            The Oracle will evaluate your idea. If approved, you'll gain access to the full HiveMind.
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
      </div>
    </div>
  );
}
