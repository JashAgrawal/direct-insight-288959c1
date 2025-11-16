import { useNavigate } from 'react-router-dom';
import { useIdeaStore } from '@/stores/ideaStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Flame, CheckCircle2, AlertCircle, XCircle, Trash2, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function AnalyzeIdeas() {
  const { ideas, setActiveIdea, deleteIdea } = useIdeaStore();
  const navigate = useNavigate();

  const handleCreateNewIdea = () => {
    setActiveIdea(null);
    navigate('/');
  };

  const handleNavigateToIdea = (ideaId: string) => {
    setActiveIdea(ideaId);
    const idea = ideas.find(i => i.id === ideaId);

    // If idea is unlocked (VIABLE/FIRE), go to dashboard
    if (idea && (idea.verdict === 'VIABLE' || idea.verdict === 'FIRE')) {
      navigate('/dashboard');
    } else {
      // Otherwise go to Oracle chat to continue conversation
      navigate('/oracle-chat');
    }
  };

  const handleDeleteIdea = (ideaId: string, ideaName: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (window.confirm(`Delete "${ideaName}"? This action cannot be undone.`)) {
      deleteIdea(ideaId);
      toast.success('Idea deleted');
    }
  };

  const getVerdictIcon = (verdict: string | null) => {
    switch (verdict) {
      case 'FIRE':
        return <Flame className="h-5 w-5 text-orange-500" />;
      case 'VIABLE':
        return <CheckCircle2 className="h-5 w-5 text-green-500" />;
      case 'MID':
        return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'TRASH':
        return <XCircle className="h-5 w-5 text-red-500" />;
      default:
        return <AlertCircle className="h-5 w-5 text-muted-foreground" />;
    }
  };

  const getVerdictText = (verdict: string | null) => {
    return verdict || 'PENDING';
  };

  const getVerdictColor = (verdict: string | null) => {
    switch (verdict) {
      case 'FIRE':
        return 'text-orange-500 border-orange-500/50 bg-orange-500/5';
      case 'VIABLE':
        return 'text-green-500 border-green-500/50 bg-green-500/5';
      case 'MID':
        return 'text-yellow-500 border-yellow-500/50 bg-yellow-500/5';
      case 'TRASH':
        return 'text-red-500 border-red-500/50 bg-red-500/5';
      default:
        return 'text-muted-foreground border-border';
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto">
      <div className="mb-8 flex items-start justify-between">
        <div>
          <h1 className="text-3xl font-mono font-bold text-primary mb-2">ALL IDEAS</h1>
          <p className="text-sm font-mono text-muted-foreground">
            {ideas.length} {ideas.length === 1 ? 'idea' : 'ideas'} submitted to the Oracle
          </p>
        </div>
        <Button onClick={handleCreateNewIdea} className="font-mono">
          <Sparkles className="mr-2 h-4 w-4" />
          NEW IDEA
        </Button>
      </div>

      {ideas.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center space-y-4">
            <div>
              <p className="text-2xl font-mono font-bold text-primary mb-2">👔 NO SHIT</p>
              <p className="font-mono text-muted-foreground mb-2">No ideas yet. Time to submit one to the Oracle.</p>
              <p className="text-xs font-mono text-muted-foreground">
                The Oracle will judge your idea. Only VIABLE or FIRE ideas unlock the full AI boardroom.
              </p>
            </div>
            <Button onClick={handleCreateNewIdea} className="font-mono">
              <Sparkles className="mr-2 h-4 w-4" />
              SUBMIT YOUR FIRST IDEA
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ideas.map((idea) => (
            <Card
              key={idea.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${getVerdictColor(idea.verdict)}`}
              onClick={() => handleNavigateToIdea(idea.id)}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1">
                    <CardTitle className="font-mono text-lg mb-2">{idea.name}</CardTitle>
                    <div className="flex items-center gap-2">
                      {getVerdictIcon(idea.verdict)}
                      <span className="text-xs font-mono font-bold">
                        {getVerdictText(idea.verdict)}
                      </span>
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => handleDeleteIdea(idea.id, idea.name, e)}
                    className="hover:bg-destructive/10 hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <p className="text-sm font-mono text-muted-foreground line-clamp-3 mb-4">
                  {idea.description}
                </p>
                <div className="flex items-center justify-between text-xs font-mono text-muted-foreground">
                  <span>{new Date(idea.createdAt).toLocaleDateString()}</span>
                  <div className="flex items-center gap-1 text-primary">
                    <span>VIEW</span>
                    <ArrowRight className="h-3 w-3" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

