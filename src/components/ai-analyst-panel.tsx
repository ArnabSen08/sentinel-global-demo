'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Send, User, Loader2, Sparkles } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { askAnalyst, getExecutiveBriefing } from '@/app/ai-actions';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';


interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export function AiAnalystPanel() {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hello! I am the Sentinel AI Analyst. Ask me anything about the real-time data.'}
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const handleBriefing = async () => {
        setIsLoading(true);
        setMessages(prev => [...prev, { role: 'user', content: 'Please generate an executive briefing.' }]);

        try {
            const response = await getExecutiveBriefing();
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'Briefing Error',
                description: 'Could not generate the briefing.',
            });
             setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I was unable to generate the briefing at this time.' }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const response = await askAnalyst(currentInput);
            const assistantMessage: Message = { role: 'assistant', content: response };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            toast({
                variant: 'destructive',
                title: 'AI Analyst Error',
                description: 'Could not get a response from the analyst.',
            });
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col">
             <div className="p-2 flex justify-end border-b border-border">
                <Button variant="ghost" size="sm" onClick={handleBriefing} disabled={isLoading}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Generate Briefing
                </Button>
            </div>
            <ScrollArea className="flex-1" ref={scrollAreaRef}>
                 <div className="flex-1 space-y-4">
                    {messages.map((message, index) => (
                        <div key={index} className={cn(
                            "flex items-start gap-3",
                            message.role === 'user' ? 'justify-end' : 'justify-start'
                        )}>
                            {message.role === 'assistant' && <Bot className="h-6 w-6 text-primary flex-shrink-0" />}
                            <div className={cn(
                                "p-3 rounded-lg max-w-sm prose prose-sm prose-invert prose-p:my-2 prose-headings:my-3",
                                message.role === 'user' ? 'bg-primary/20 text-foreground' : 'bg-card'
                            )}>
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                    {message.content}
                                </ReactMarkdown>
                            </div>
                             {message.role === 'user' && <User className="h-6 w-6 text-primary/80 flex-shrink-0" />}
                        </div>
                    ))}
                     {isLoading && messages[messages.length-1]?.role === 'user' && (
                        <div className="flex items-start gap-3 justify-start">
                            <Bot className="h-6 w-6 text-primary flex-shrink-0" />
                            <div className="p-3 rounded-lg bg-card flex items-center">
                               <Loader2 className="h-5 w-5 animate-spin" />
                            </div>
                        </div>
                    )}
                </div>
            </ScrollArea>
             <div className="p-4 border-t border-border">
                <form onSubmit={handleSubmit} className="flex gap-2">
                    <Textarea
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        placeholder="e.g., 'Any major earthquakes...'"
                        className="flex-1"
                        rows={1}
                        onKeyDown={(e) => {
                            if (e.key === 'Enter' && !e.shiftKey) {
                                e.preventDefault();
                                handleSubmit(e);
                            }
                        }}
                        disabled={isLoading}
                    />
                    <Button type="submit" disabled={isLoading || !input.trim()}>
                        <Send className="h-4 w-4" />
                    </Button>
                </form>
            </div>
        </div>
    );
}
