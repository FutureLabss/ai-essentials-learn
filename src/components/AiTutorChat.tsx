import { useState, useRef, useEffect } from "react";
import { X, Send, User, Sparkles, RotateCcw, Brain } from "lucide-react";
import { Button } from "@/components/ui/button";
import ReactMarkdown from "react-markdown";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/hooks/useAuth";

type Msg = { role: "user" | "assistant"; content: string };

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-tutor`;

const SUGGESTED_QUESTIONS = [
  { emoji: "🤖", text: "What are AI agents and how do they work?" },
  { emoji: "🔍", text: "Explain RAG in simple terms" },
  { emoji: "📰", text: "What's new in AI this week?" },
  { emoji: "✍️", text: "How do I get started with prompt engineering?" },
];

export default function AiTutorChat({ courseId }: { courseId?: string }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [conversationId, setConversationId] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, open]);

  useEffect(() => {
    if (open && user && messages.length === 0) {
      loadRecentConversation();
    }
  }, [open, user]);

  const loadRecentConversation = async () => {
    if (!user) return;
    try {
      const { data: convo } = await supabase
        .from("chat_conversations")
        .select("id")
        .eq("user_id", user.id)
        .order("updated_at", { ascending: false })
        .limit(1)
        .single();

      if (convo) {
        const { data: msgs } = await supabase
          .from("chat_messages")
          .select("role, content")
          .eq("conversation_id", convo.id)
          .order("created_at", { ascending: true })
          .limit(50);

        if (msgs && msgs.length > 0) {
          setConversationId(convo.id);
          setMessages(msgs.map((m: any) => ({ role: m.role, content: m.content })));
        }
      }
    } catch {
      // No previous conversation
    }
  };

  const startNewChat = () => {
    setMessages([]);
    setConversationId(null);
  };

  const send = async (overrideText?: string) => {
    const text = (overrideText || input).trim();
    if (!text || isLoading) return;
    if (!overrideText) setInput("");

    const userMsg: Msg = { role: "user", content: text };
    setMessages((prev) => [...prev, userMsg]);
    setIsLoading(true);

    let assistantSoFar = "";
    const allMessages = [...messages, userMsg];

    try {
      const resp = await fetch(CHAT_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          messages: allMessages,
          courseId,
          conversationId,
          userId: user?.id,
        }),
      });

      if (!resp.ok) {
        const err = await resp.json().catch(() => ({}));
        throw new Error(err.error || "Failed to get response");
      }

      if (!resp.body) throw new Error("No response body");

      const reader = resp.body.getReader();
      const decoder = new TextDecoder();
      let textBuffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        textBuffer += decoder.decode(value, { stream: true });

        let newlineIndex: number;
        while ((newlineIndex = textBuffer.indexOf("\n")) !== -1) {
          let line = textBuffer.slice(0, newlineIndex);
          textBuffer = textBuffer.slice(newlineIndex + 1);
          if (line.endsWith("\r")) line = line.slice(0, -1);
          if (line.startsWith(":") || line.trim() === "") continue;
          if (!line.startsWith("data: ")) continue;

          const jsonStr = line.slice(6).trim();
          if (jsonStr === "[DONE]") break;

          try {
            const parsed = JSON.parse(jsonStr);
            const content = parsed.choices?.[0]?.delta?.content as string | undefined;
            if (content) {
              assistantSoFar += content;
              setMessages((prev) => {
                const last = prev[prev.length - 1];
                if (last?.role === "assistant") {
                  return prev.map((m, i) =>
                    i === prev.length - 1 ? { ...m, content: assistantSoFar } : m
                  );
                }
                return [...prev, { role: "assistant", content: assistantSoFar }];
              });
            }
          } catch {
            textBuffer = line + "\n" + textBuffer;
            break;
          }
        }
      }

      if (user?.id && assistantSoFar) {
        let activeConvoId = conversationId;
        if (!activeConvoId) {
          const { data: newConvo } = await supabase
            .from("chat_conversations")
            .insert({ user_id: user.id, course_id: courseId || null })
            .select("id")
            .single();
          if (newConvo) {
            activeConvoId = newConvo.id;
            setConversationId(newConvo.id);
          }
        }
        if (activeConvoId) {
          await supabase.from("chat_messages").insert({
            conversation_id: activeConvoId,
            role: "user",
            content: text,
          });
          await supabase.from("chat_messages").insert({
            conversation_id: activeConvoId,
            role: "assistant",
            content: assistantSoFar,
          });
          await supabase
            .from("chat_conversations")
            .update({ updated_at: new Date().toISOString() })
            .eq("id", activeConvoId);
        }
      }
    } catch (e: any) {
      toast.error(e.message || "Something went wrong");
      console.error(e);
    }
    setIsLoading(false);
  };

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!open && (
          <motion.div
            initial={{ scale: 0, rotate: -180 }}
            animate={{ scale: 1, rotate: 0 }}
            exit={{ scale: 0, rotate: 180 }}
            transition={{ type: "spring", stiffness: 260, damping: 20 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <button
              onClick={() => setOpen(true)}
              className="group relative h-14 w-14 rounded-2xl bg-gradient-to-br from-primary via-primary to-primary/70 shadow-[0_8px_32px_-4px_hsl(var(--primary)/0.5)] hover:shadow-[0_12px_40px_-4px_hsl(var(--primary)/0.6)] transition-all duration-300 hover:scale-105 active:scale-95 flex items-center justify-center"
            >
              <Brain className="h-6 w-6 text-primary-foreground transition-transform group-hover:scale-110" />
              <span className="absolute -top-1 -right-1 h-3.5 w-3.5 rounded-full bg-accent-foreground border-2 border-background animate-pulse" />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Panel */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 60, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 60, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 28 }}
            className="fixed bottom-6 right-6 z-50 w-[400px] max-w-[calc(100vw-2rem)] h-[580px] max-h-[calc(100vh-4rem)] rounded-2xl border border-border/60 bg-backgrounkgrounkground shadow-[0_24px_80px_-12px_rgba(0,0,0,0.25)] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-4 py-3 border-b border-border/40">
              <div className="absolute inset-0 bg-gradient-to-r from-primary/8 via-primary/4 to-transparent" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="relative">
                    <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-primary to-primary/70 flex items-center justify-center shadow-sm">
                      <Brain className="h-4.5 w-4.5 text-primary-foreground" />
                    </div>
                    <span className="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-accent-foreground border-2 border-card" />
                  </div>
                  <div>
                    <h3 className="font-display font-bold text-sm tracking-tight">Mr. AI</h3>
                    <p className="text-[10px] text-muted-foreground leading-tight">Your AI Expert · Online</p>
                  </div>
                </div>
                <div className="flex items-center gap-0.5">
                  {messages.length > 0 && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="h-7 text-[11px] px-2 gap-1 text-muted-foreground hover:text-foreground"
                      onClick={startNewChat}
                    >
                      <RotateCcw className="h-3 w-3" /> New
                    </Button>
                  )}
                  <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-foreground" onClick={() => setOpen(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>

            {/* Messages */}
            <div ref={scrollRef} className="flex-1 overflo5 py-5 space-y-5ce-y-5ce-y-4">
              {messages.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 }}
                  className="text-center py-4"
                >
                  <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center mx-auto mb-4 shadow-inner">
                    <Brain className="h-8 w-8 text-primary/50" />
                  </div>
                  <p className="font-display font-bold text-foreground text-base">Hey, I'm Mr. AI! 🧠</p>
                  <p className="text-xs text-muted-foreground mt-1.5 max-w-[260px] mx-auto leading-relaxed">
                    Your personal AI tutor. Ask me anything about AI — from basics to cutting-edge research.
                  </p>
                  <div className="mt-5 space-y-2">
                    {SUGGESTED_QUESTIONS.map((q, i) => (
                      <motion.button
                        key={q.text}
                        initial={{ opacity: 0, x: -12 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.2 + i * 0.08 }}
                        onClick={() => send(q.text)}
                        className="group flex items-center gap-2.5 w-full text-left text-xs px-3.5 py-2.5 rounded-xl border border-border/60 hover:border-primary/40 hover:bg-primary/5 transition-all duration-200"
                      >
                        <span className="text-sm">{q.emoji}</span>
                        <span className="text-muted-foreground group-hover:text-foreground transition-colors">{q.text}</span>
                      </motion.button>
                    ))}
                  </div>
                </motion.div>
              )}

              {messages.map((msg, i) => (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`flex gap-2.5 ${msg.role === "user" ? "justify-end" : ""}`}
                >
                  {msg.role === "assistant" && (
                    <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0 mt-1">
                      <Brain className="h-3.5 w-3.5 text-primary" />
                    </div>
                  )}
                  <div
                    className={`rounded-2xl px-3.5 py-2.5 text-sm max-w-[80%] ${
                      msg.role === "user"
                        ? "bg-primary text-primary-foreground rounded-br-md"
                        : "bg-muted/50 border border-border/40 rounded-bl-md"
                    }`}
                  >
                    {msg.role === "assistant" ? (
                      <div className="prose prose-sm max-w-none [&>p]:mb-1.5 [&>p]:last:mb-0 [&>p]:leading-relaxed [&>ul]:my-1 [&>ol]:my-1 [&_code]:bg-background/60 [&_code]:px-1 [&_code]:py-0.5 [&_code]:rounded [&_code]:text-xs">
                        <ReactMarkdown>{msg.content}</ReactMarkdown>
                      </div>
                    ) : (
                      <span className="leading-relaxed">{msg.content}</span>
                    )}
                  </div>
                  {msg.role === "user" && (
                    <div className="h-6 w-6 rounded-lg bg-primary flex items-center justify-center shrink-0 mt-1">
                      <User className="h-3.5 w-3.5 text-primary-foreground" />
                    </div>
                  )}
                </motion.div>
              ))}

              {isLoading && messages[messages.length - 1]?.role !== "assistant" && (
                <motion.div
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex gap-2.5"
                >
                  <div className="h-6 w-6 rounded-lg bg-gradient-to-br from-primary/15 to-primary/5 flex items-center justify-center shrink-0">
                    <Brain className="h-3.5 w-3.5 text-primary" />
                  </div>
                  <div className="bg-muted/50 border border-border/40 rounded-2xl rounded-bl-md px-4 py-3">
                    <div className="flex gap-1.5">
                      <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:0ms]" />
                      <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:150ms]" />
                      <span className="h-2 w-2 rounded-full bg-primary/40 animate-bounce [animation-delay:300ms]" />
                    </div>
                  </div>
                </motion.div>
              )}
            </div>

            {/* Input */}
            <div className="border-t border-border/4 py-3 bg-backgrounbg-card">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  send();
                }}
                className="flex gap-2 items-end"
              >
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask Mr. AI anything…"
                  className="flex-1 text-sm bg-muted/30 border border-border/50 rounded-xl px-3.5 py-2.5 outline-none focus:ring-2 focus:ring-primary/20 focus:border-primary/40 transition-all placeholder:text-muted-foreground/60"
                  disabled={isLoading}
                />
                <Button
                  type="submit"
                  size="icon"
                  className="h-9 w-9 shrink-0 rounded-xl bg-primary hover:bg-primary/90 shadow-sm transition-all active:scale-95"
                  disabled={isLoading || !input.trim()}
                >
                  <Send className="h-4 w-4" />
                </Button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
