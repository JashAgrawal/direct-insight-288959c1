import { AGENTS, Agent } from './agents';

interface RoutingDecision {
  agent: Agent;
  confidence: number;
  reasoning: string;
}

export class HiveMindOrchestrator {
  /**
   * Routes a user question to the most appropriate agent
   * Acts like a board chair directing questions to the right exec
   */
  route(userMessage: string): RoutingDecision {
    const message = userMessage.toLowerCase();
    
    // Calculate scores for each agent based on keyword matching
    const scores: Array<{ agent: Agent; score: number }> = [];
    
    for (const agent of Object.values(AGENTS)) {
      let score = 0;
      
      // Check expertise keywords
      for (const expertise of agent.expertise) {
        if (message.includes(expertise)) {
          score += 10;
        }
      }
      
      // Boost specific patterns
      if (agent.id === 'ceo' && (
        message.includes('strategy') || 
        message.includes('vision') || 
        message.includes('direction') ||
        message.includes('should i') ||
        message.includes('roadmap')
      )) {
        score += 15;
      }
      
      if (agent.id === 'cto' && (
        message.includes('build') || 
        message.includes('stack') || 
        message.includes('tech') ||
        message.includes('code') ||
        message.includes('api')
      )) {
        score += 15;
      }
      
      if (agent.id === 'cmo' && (
        message.includes('brand') || 
        message.includes('market') || 
        message.includes('gtm') ||
        message.includes('design') ||
        message.includes('style') ||
        message.includes('launch')
      )) {
        score += 15;
      }
      
      if (agent.id === 'cfo' && (
        message.includes('price') || 
        message.includes('cost') || 
        message.includes('revenue') ||
        message.includes('money') ||
        message.includes('burn') ||
        message.includes('funding')
      )) {
        score += 15;
      }
      
      if (agent.id === 'pitch' && (
        message.includes('pitch') || 
        message.includes('deck') || 
        message.includes('investor') ||
        message.includes('present')
      )) {
        score += 15;
      }
      
      if (agent.id === 'legal' && (
        message.includes('legal') || 
        message.includes('contract') || 
        message.includes('terms') ||
        message.includes('compliance') ||
        message.includes('privacy')
      )) {
        score += 15;
      }
      
      if (agent.id === 'growth' && (
        message.includes('growth') || 
        message.includes('user') || 
        message.includes('acquisition') ||
        message.includes('channel') ||
        message.includes('traction') ||
        message.includes('viral')
      )) {
        score += 15;
      }
      
      if (agent.id === 'psych' && (
        message.includes('burn') && message.includes('out') || 
        message.includes('stress') || 
        message.includes('mental') ||
        message.includes('tired') ||
        message.includes('overwhelm')
      )) {
        score += 15;
      }
      
      scores.push({ agent, score });
    }
    
    // Sort by score
    scores.sort((a, b) => b.score - a.score);
    
    // If top score is 0, default to Assistant
    if (scores[0].score === 0) {
      return {
        agent: AGENTS.assistant,
        confidence: 0.5,
        reasoning: 'No specific expertise match, routing to Assistant for general handling'
      };
    }
    
    // Return highest scoring agent
    const topAgent = scores[0];
    const confidence = Math.min(topAgent.score / 30, 1); // Normalize to 0-1
    
    return {
      agent: topAgent.agent,
      confidence,
      reasoning: `Matched ${topAgent.score} points based on expertise keywords`
    };
  }
  
  /**
   * Get agent by ID
   */
  getAgent(agentId: string): Agent | null {
    return AGENTS[agentId] || null;
  }
  
  /**
   * Get all agents
   */
  getAllAgents(): Agent[] {
    return Object.values(AGENTS);
  }
}

export const hivemind = new HiveMindOrchestrator();
