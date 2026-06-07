"use client";
import { useState, useRef, useEffect } from "react";
import { Send, Bot, User, Sparkles } from "lucide-react";
import ReactMarkdown from "react-markdown";
import { TopBar } from "@/components/layout/TopBar";
import { api } from "@/lib/api";

interface Message {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: string[];
}

const STARTERS = [
  "Summarize my emails from today",
  "What tasks are most urgent right now?",
  "How was my GitHub activity this week?",
  "Which emails need a reply today?",
];

export default function AIAssistantPage() {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "assistant",
      content: "Hi! I'm your NeuronOS AI assistant. I have context on your emails, tasks, and GitHub activity. What would you like to know?",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const sendMessage = async (text: string) => {
    if (!text.trim() || loading) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const result = await api.runCommand(text);
      const assistantMsg: Message = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: result.response,
        sources: result.sources,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        { id: (Date.now() + 1).toString(), role: "assistant", content: "Sorry, something went wrong. Please try again." },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <TopBar title="AI Assistant" />
      <div className="flex-1 flex flex-col overflow-hidden max-w-3xl w-full mx-auto px-4">

        {/* Messages */}
        <div className="flex-1 overflow-y-auto py-6 space-y-5">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}>
              <div className={`w-7 h-7 rounded-full flex items-center justify-center shrink-0 ${msg.role === "assistant" ? "bg-purple-600" : "bg-white/10"}`}>
                {msg.role === "assistant" ? <Bot size={14} className="text-white" /> : <User size={14} className="text-white" />}
              </div>
              <div className={`max-w-[80%] ${msg.role === "user" ? "items-end" : "items-start"} flex flex-col gap-1`}>
                <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === "assistant"
                    ? "bg-[#111] border border-white/[0.06] text-[hsl(var(--foreground))] prose prose-invert prose-sm max-w-none"
                    : "bg-purple-600 text-white"
                }`}>
                  {msg.role === "assistant" ? (
                    <ReactMarkdown
                      components={{
                        p: ({ children }) => <p className="mb-2 last:mb-0">{children}</p>,
                        strong: ({ children }) => <strong className="font-semibold text-white">{children}</strong>,
                        ul: ({ children }) => <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>,
                        ol: ({ children }) => <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>,
                        li: ({ children }) => <li className="text-[hsl(var(--foreground))]">{children}</li>,
                        h1: ({ children }) => <h1 className="text-base font-bold text-white mb-2">{children}</h1>,
                        h2: ({ children }) => <h2 className="text-sm font-semibold text-white mb-1">{children}</h2>,
                        h3: ({ children }) => <h3 className="text-sm font-medium text-white mb-1">{children}</h3>,
                        code: ({ children }) => <code className="bg-white/10 px-1 py-0.5 rounded text-xs font-mono">{children}</code>,
                      }}
                    >
                      {msg.content}
                    </ReactMarkdown>
                  ) : (
                    msg.content
                  )}
                </div>
                {msg.sources && msg.sources.length > 0 && (
                  <p className="text-xs text-[hsl(var(--muted-foreground))] px-1">
                    Based on: {msg.sources.join(", ")}
                  </p>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="flex gap-3">
              <div className="w-7 h-7 rounded-full bg-purple-600 flex items-center justify-center shrink-0">
                <Bot size={14} className="text-white" />
              </div>
              <div className="px-4 py-3 rounded-2xl bg-[#111] border border-white/[0.06]">
                <div className="flex gap-1 items-center h-4">
                  {[0, 1, 2].map((i) => (
                    <span
                      key={i}
                      className="w-1.5 h-1.5 rounded-full bg-purple-400"
                      style={{ animation: `pulse-subtle 1s ${i * 0.2}s infinite` }}
                    />
                  ))}
                </div>
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Starters (show only at the beginning) */}
        {messages.length === 1 && (
          <div className="grid grid-cols-2 gap-2 pb-4">
            {STARTERS.map((s) => (
              <button
                key={s}
                onClick={() => sendMessage(s)}
                className="flex items-center gap-2 text-left text-xs px-3 py-2.5 bg-[#111] border border-white/[0.06] rounded-xl text-[hsl(var(--muted-foreground))] hover:text-white hover:border-white/10 transition-colors"
              >
                <Sparkles size={12} className="text-purple-400 shrink-0" />
                {s}
              </button>
            ))}
          </div>
        )}

        {/* Input */}
        <div className="pb-6">
          <div className="flex items-center gap-2 bg-[#111] border border-white/[0.08] rounded-xl px-4 py-3 focus-within:border-purple-500/40 transition-colors">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && sendMessage(input)}
              placeholder="Ask about your emails, tasks, or GitHub..."
              className="flex-1 bg-transparent text-sm text-white placeholder:text-[hsl(var(--muted-foreground))] outline-none"
            />
            <button
              onClick={() => sendMessage(input)}
              disabled={!input.trim() || loading}
              className="text-purple-400 hover:text-purple-300 disabled:opacity-30 transition-colors"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
