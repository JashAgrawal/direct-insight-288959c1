import { useIdeaStore } from '@/stores/ideaStore';
import { Button } from '@/components/ui/button';
import { sendToGemini } from '@/lib/gemini';
import { useState } from 'react';
import { toast } from 'sonner';

export function IdeaValidator() {
  const { getActiveIdea, updateIdea } = useIdeaStore();
  const [isValidating, setIsValidating] = useState(false);
  const activeIdea = getActiveIdea();
  
  if (!activeIdea) {
    return (
      <div className="text-center text-muted-foreground font-mono text-sm py-12">
        Select an idea to validate
      </div>
    );
  }
  
  const handleValidate = async () => {
    if (!activeIdea) return;
    
    setIsValidating(true);
    
    try {
      const validationPrompt = `Validate this startup idea comprehensively:

NAME: ${activeIdea.name}
DESCRIPTION: ${activeIdea.description}

Provide a BRUTAL, honest validation covering:
1. Problem breakdown (is it real?)
2. Target market (who actually needs this?)
3. Business model (how does money work?)
4. Competitors (who else does this?)
5. Growth plan (how to scale?)
6. Legal checks (what could go wrong?)
7. Funding needs (how much $?)
8. Real pros/cons (no BS)
9. Brutally honest review (roast if needed)

Be direct. No sugarcoating. Use Gen-Z language but stay professional.`;

      // This is a placeholder - in real implementation, you'd call multiple agents
      // For now, using a single comprehensive prompt
      const apiKey = localStorage.getItem('oracle-api-key');
      if (!apiKey) {
        toast.error('API key not found');
        return;
      }
      
      const response = await sendToGemini(validationPrompt, apiKey);
      
      // Parse response (simplified - would be more sophisticated in production)
      updateIdea(activeIdea.id, {
        validated: true,
        validationData: {
          problem: 'Validation complete',
          targetMarket: response,
          businessModel: '',
          competitors: '',
          growthPlan: '',
          legalChecks: '',
          fundingNeeds: '',
          prosAndCons: '',
          brutalReview: response,
        },
      });
      
      toast.success('Validation complete!');
    } catch (error) {
      toast.error('Validation failed');
    } finally {
      setIsValidating(false);
    }
  };
  
  return (
    <div className="space-y-4">
      <div className="border-b border-border pb-4">
        <h2 className="text-xl font-mono font-bold text-primary">IDEA VALIDATOR</h2>
        <p className="text-xs font-mono text-muted-foreground">
          {activeIdea.name}
        </p>
      </div>
      
      {!activeIdea.validated ? (
        <div className="text-center py-12 space-y-4">
          <p className="font-mono text-sm text-muted-foreground">
            Ready to get brutal feedback on this idea?
          </p>
          <Button onClick={handleValidate} disabled={isValidating}>
            {isValidating ? 'VALIDATING...' : 'VALIDATE IDEA'}
          </Button>
        </div>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-4">
            <ValidationSection
              title="Problem Breakdown"
              content={activeIdea.validationData?.problem || 'N/A'}
            />
            <ValidationSection
              title="Target Market"
              content={activeIdea.validationData?.targetMarket || 'N/A'}
            />
            <ValidationSection
              title="Business Model"
              content={activeIdea.validationData?.businessModel || 'N/A'}
            />
            <ValidationSection
              title="Competitors"
              content={activeIdea.validationData?.competitors || 'N/A'}
            />
            <ValidationSection
              title="Growth Plan"
              content={activeIdea.validationData?.growthPlan || 'N/A'}
            />
            <ValidationSection
              title="Legal Checks"
              content={activeIdea.validationData?.legalChecks || 'N/A'}
            />
            <ValidationSection
              title="Funding Needs"
              content={activeIdea.validationData?.fundingNeeds || 'N/A'}
            />
            <ValidationSection
              title="Pros & Cons"
              content={activeIdea.validationData?.prosAndCons || 'N/A'}
            />
            <div className="border-2 border-accent p-4 bg-accent/5">
              <h3 className="text-xs font-mono font-bold text-accent uppercase tracking-wider mb-2">
                🔥 BRUTAL REVIEW
              </h3>
              <p className="font-mono text-sm text-foreground whitespace-pre-wrap">
                {activeIdea.validationData?.brutalReview || 'N/A'}
              </p>
            </div>
          </div>
          
          <Button variant="outline" onClick={handleValidate} disabled={isValidating}>
            RE-VALIDATE
          </Button>
        </div>
      )}
    </div>
  );
}

function ValidationSection({ title, content }: { title: string; content: string }) {
  return (
    <div className="border border-border p-3">
      <h3 className="text-xs font-mono font-bold text-primary uppercase tracking-wider mb-2">
        {title}
      </h3>
      <p className="font-mono text-xs text-foreground whitespace-pre-wrap">
        {content}
      </p>
    </div>
  );
}
