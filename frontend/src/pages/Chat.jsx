import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Send, Loader2, ChevronDown, ChevronUp, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { apiFetch } from "@/lib/auth";
export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [expandedSources, setExpandedSources] = useState(
    /* @__PURE__ */ new Set(),
  );
  const scrollRef = useRef(null);
  useEffect(() => {
    scrollRef.current?.scrollTo({
      top: scrollRef.current.scrollHeight,
      behavior: "smooth",
    });
  }, [messages]);
  const toggleSource = (idx) => {
    setExpandedSources((prev) => {
      const next = new Set(prev);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  };
  const handleSend = async () => {
    const query = input.trim();
    if (!query || loading) return;
    const userMsg = { role: "user", content: query };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);
    try {
      const res = await apiFetch("/chat", {
        method: "POST",
        body: JSON.stringify({ query }),
      });
      if (!res.ok) throw new Error("Failed to get response");
      const data = await res.json();
      const assistantMsg = {
        role: "assistant",
        content: data.answer || data.response || "No response received.",
        sources: data.sources || data.source_documents,
      };
      setMessages((prev) => [...prev, assistantMsg]);
    } catch {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content: "Sorry, something went wrong. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };
  return (
    <div className="flex flex-col h-screen">
      {/* Header */}
      <div className="border-b px-6 py-3 shrink-0">
        <h1 className="text-sm font-semibold">Chat</h1>
        <p className="text-xs text-muted-foreground">
          Ask anything about your project data
        </p>
      </div>
      {/* Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-4"
      >
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="h-12 w-12 rounded-xl gradient-primary flex items-center justify-center mb-4">
              <Bot className="h-6 w-6 text-primary-foreground" />
            </div>
            <h2 className="text-lg font-semibold mb-1">Start a conversation</h2>
            <p className="text-sm text-muted-foreground max-w-sm">
              Ask questions about your uploaded datasets or connected Jira
              projects.
            </p>
          </div>
        )}
        <AnimatePresence>
          {messages.map((msg, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25 }}
              className={`flex gap-3 ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "assistant" && (
                <div className="h-7 w-7 rounded-lg gradient-primary flex items-center justify-center shrink-0 mt-0.5">
                  <Bot className="h-3.5 w-3.5 text-primary-foreground" />
                </div>
              )}
              <div
                className={`max-w-[70%] rounded-xl px-4 py-3 text-sm leading-relaxed ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-secondary text-secondary-foreground"}`}
              >
                <p className="whitespace-pre-wrap">{msg.content}</p>
                {msg.sources && msg.sources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-border/50">
                    <button
                      onClick={() => toggleSource(i)}
                      className="flex items-center gap-1 text-xs font-medium opacity-70 hover:opacity-100 transition-opacity"
                    >
                      {expandedSources.has(i) ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronDown className="h-3 w-3" />
                      )}
                      {msg.sources.length} source
                      {msg.sources.length > 1 ? "s" : ""}
                    </button>
                    {expandedSources.has(i) && (
                      <div className="mt-2 space-y-2">
                        {msg.sources.map((src, j) => (
                          <div
                            key={j}
                            className="rounded-lg bg-background/50 p-2.5 text-xs"
                          >
                            {src.title && (
                              <p className="font-medium mb-1">{src.title}</p>
                            )}
                            <p className="opacity-80 line-clamp-3">
                              {src.content || JSON.stringify(src)}
                            </p>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
              {msg.role === "user" && (
                <div className="h-7 w-7 rounded-lg bg-foreground/10 flex items-center justify-center shrink-0 mt-0.5">
                  <User className="h-3.5 w-3.5 text-foreground" />
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        {loading && (
          <div className="flex gap-3">
            <div className="h-7 w-7 rounded-lg gradient-primary flex items-center justify-center shrink-0">
              <Bot className="h-3.5 w-3.5 text-primary-foreground" />
            </div>
            <div className="bg-secondary rounded-xl px-4 py-3">
              <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
            </div>
          </div>
        )}
      </div>
      {/* Input */}
      <div className="border-t px-6 py-4 shrink-0">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex items-center gap-2"
        >
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your project..."
            className="flex-1 rounded-lg border bg-card px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-ring/20 transition-shadow placeholder:text-muted-foreground"
            disabled={loading}
          />
          <Button type="submit" size="icon" disabled={loading || !input.trim()}>
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </div>
  );
}
