import { Message } from '@/stores/chatStore';
import { AgentBadge } from './AgentBadge';
import Markdown from 'react-markdown'


interface ChatMessageProps {
  message: Message;
}

export function ChatMessage({ message }: ChatMessageProps) {
  return (
    <div
      className={`font-mono text-sm border-l-2 pl-4 py-2 ${
        message.role === 'user'
          ? 'border-accent text-accent'
          : 'border-primary text-foreground'
      }`}
    >
      <div className="flex items-center gap-2 mb-2">
        <div className="text-xs opacity-60">
          {message.role === 'user' ? '> USER' : message.agentId === 'oracle' ? '> ORACLE' : '> AGENT'}
        </div>
        {message.role === 'assistant' && message.agentId && (
          <AgentBadge agentId={message.agentId} />
        )}
      </div>
      <div className="whitespace-pre-wrap"><Markdown>{message.content}</Markdown></div>
    </div>
  );
}
