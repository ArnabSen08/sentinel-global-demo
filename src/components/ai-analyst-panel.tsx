'use client';

import { useState, useRef, useEffect } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Bot, Send, User, Loader2, Sparkles, Key, Settings2 } from 'lucide-react';
import { Textarea } from './ui/textarea';
import { Button } from './ui/button';
import { Input } from './ui/input';
import { ScrollArea } from './ui/scroll-area';
import { cn } from '@/lib/utils';
import { useToast } from '@/hooks/use-toast';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';

interface Message {
    role: 'user' | 'assistant';
    content: string;
}

export function AiAnalystPanel() {
    const [messages, setMessages] = useState<Message[]>([
        { role: 'assistant', content: 'Hello! I am the Sentinel AI Analyst. Select your provider and enter your API key to activate me.'}
    ]);
    const [input, setInput] = useState('');
    const [apiKey, setApiKey] = useState('');
    const [provider, setProvider] = useState('nvidia');
    const [showSettings, setShowSettings] = useState(true);
    const [isLoading, setIsLoading] = useState(false);
    const { toast } = useToast();
    const scrollAreaRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        if (scrollAreaRef.current) {
            scrollAreaRef.current.scrollTo({ top: scrollAreaRef.current.scrollHeight, behavior: 'smooth' });
        }
    }, [messages]);

    const callLLM = async (prompt: string): Promise<string> => {
        if (!apiKey) {
            throw new Error("API key not provided.");
        }
        
        if (provider === 'nvidia') {
            const res = await fetch('https://integrate.api.nvidia.com/v1/chat/completions', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${apiKey}`
                },
                body: JSON.stringify({
                    model: 'meta/llama-3.1-70b-instruct',
                    messages: [{ role: 'system', content: 'You are an expert AI data analyst for Sentinel Global.' }, { role: 'user', content: prompt }],
                    temperature: 0.2
                })
            });
            if (!res.ok) throw new Error("Nvidia API failed.");
            const data = await res.json();
            return data.choices[0].message.content;
        } else {
            // Gemini
            const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: `You are an expert AI data analyst for Sentinel Global. ${prompt}` }] }]
                })
            });
            if (!res.ok) throw new Error("Gemini API failed.");
            const data = await res.json();
            return data.candidates[0].content.parts[0].text;
        }
    };

    const handleBriefing = async () => {
        if (!apiKey) {
             toast({ variant: 'destructive', title: 'Missing Key', description: 'Please enter an API key.' });
             setShowSettings(true);
             return;
        }
        setIsLoading(true);
        setMessages(prev => [...prev, { role: 'user', content: 'Please generate an executive briefing.' }]);

        try {
            const response = await callLLM("Generate a brief executive summary of recent global events (mention dummy stock rallies, earthquake spikes, and ship movements).");
            setMessages(prev => [...prev, { role: 'assistant', content: response }]);
        } catch (error) {
            toast({ variant: 'destructive', title: 'Briefing Error', description: 'Check your API key.' });
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I was unable to generate the briefing at this time.' }]);
        } finally {
            setIsLoading(false);
        }
    };
    
    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!input.trim() || isLoading) return;
        if (!apiKey) {
            toast({ variant: 'destructive', title: 'Missing Key', description: 'Please enter an API key.' });
            setShowSettings(true);
            return;
        }

        const userMessage: Message = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        setIsLoading(true);

        try {
            const response = await callLLM(currentInput);
            const assistantMessage: Message = { role: 'assistant', content: response };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (error) {
            toast({ variant: 'destructive', title: 'AI Analyst Error', description: 'Invalid API key or network issue.' });
            setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error. Please try again.' }]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="h-full w-full flex flex-col">
             <div className="p-2 flex justify-between items-center border-b border-border">
                <Button variant="ghost" size="sm" onClick={() => setShowSettings(!showSettings)}>
                    <Settings2 className="h-4 w-4 mr-2" /> Settings
                </Button>
                <Button variant="ghost" size="sm" onClick={handleBriefing} disabled={isLoading}>
                    <Sparkles className="mr-2 h-4 w-4" />
                    Briefing
                </Button>
            </div>
            {showSettings && (
                <div className="p-3 bg-card border-b border-border flex flex-col gap-2">
                    <div className="flex gap-2">
                         <Select value={provider} onValueChange={setProvider}>
                            <SelectTrigger className="w-[120px]">
                                <SelectValue placeholder="Provider" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="nvidia">Nvidia NIM</SelectItem>
                                <SelectItem value="gemini">Google Gemini</SelectItem>
                            </SelectContent>
                        </Select>
                        <div className="relative flex-1">
                            <Key className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
                            <Input 
                                type="password" 
                                placeholder="sk-..." 
                                value={apiKey} 
                                onChange={e => setApiKey(e.target.value)}
                                className="pl-8"
                            />
                        </div>
                    </div>
                </div>
            )}
            <ScrollArea className="flex-1" ref={scrollAreaRef}>
                 <div className="flex-1 space-y-4 p-4">
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
                        placeholder="Ask the analyst..."
                        className="flex-1 min-h-[40px] max-h-[120px]"
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
