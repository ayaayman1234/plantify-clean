"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Bot, History, Leaf, RotateCcw, Sparkles } from "lucide-react";

import { Button } from "@/components/ui/button";
import { fetchHistory, getStoredAccessToken } from "@/lib/api";
import { getApiUrl } from "@/lib/platform";
import type { AppLocale } from "@/i18n/routing";
import type { ScanHistory } from "@/lib/types";

type ChatUiCopy = {
  starters: [string, string, string];
  timeoutError: string;
  networkError: string;
  newChat: string;
  recentScans: string;
  noScans: string;
  usingContext: string;
  withoutContext: string;
  chatMemory: string;
  starterTitle: string;
  loadingScans: string;
};

const CHAT_INTERFACE_COPY: Record<AppLocale, ChatUiCopy> = {
  en: {
    starters: [
      "What does this leaf pattern usually mean?",
      "How should I treat early blight this week?",
      "What should I monitor after spraying?"
    ],
    timeoutError: "The assistant took too long to respond. Please try a shorter question.",
    networkError: "Unable to reach chat service right now. Please try again in a few seconds.",
    newChat: "New Chat",
    recentScans: "Recent Scans",
    noScans: "No scan history yet. The assistant can still answer general crop questions.",
    usingContext: "Using scan context",
    withoutContext: "General advice mode",
    chatMemory: "The assistant remembers the recent conversation in this session.",
    starterTitle: "Try one of these prompts",
    loadingScans: "Loading recent scans..."
  },
  ar: {
    starters: [
      "ما الذي يعنيه هذا النمط على الورقة عادة؟",
      "كيف أعالج اللفحة المبكرة هذا الأسبوع؟",
      "ما الذي يجب أن أراقبه بعد الرش؟"
    ],
    timeoutError: "استغرق المساعد وقتًا طويلًا في الرد. جرّب سؤالًا أقصر.",
    networkError: "تعذر الوصول إلى خدمة الدردشة الآن. حاول مرة أخرى بعد بضع ثوانٍ.",
    newChat: "محادثة جديدة",
    recentScans: "آخر الفحوصات",
    noScans: "لا يوجد سجل فحوصات بعد. ما زال المساعد قادرًا على تقديم نصائح عامة.",
    usingContext: "يستخدم سياق الفحص",
    withoutContext: "وضع النصائح العامة",
    chatMemory: "المساعد يتذكر آخر أجزاء المحادثة داخل هذه الجلسة.",
    starterTitle: "جرّب أحد هذه الأسئلة",
    loadingScans: "جارٍ تحميل آخر الفحوصات..."
  },
  es: {
    starters: [
      "¿Qué suele significar este patrón en la hoja?",
      "¿Cómo debo tratar el tizón temprano esta semana?",
      "¿Qué debo vigilar después de fumigar?"
    ],
    timeoutError: "El asistente tardó demasiado en responder. Prueba con una pregunta más corta.",
    networkError: "No se puede conectar con el servicio de chat ahora mismo. Inténtalo de nuevo en unos segundos.",
    newChat: "Nuevo chat",
    recentScans: "Escaneos recientes",
    noScans: "Todavía no hay historial de escaneos. El asistente igual puede responder preguntas generales.",
    usingContext: "Usando contexto del escaneo",
    withoutContext: "Modo de consejo general",
    chatMemory: "El asistente recuerda la conversación reciente de esta sesión.",
    starterTitle: "Prueba una de estas preguntas",
    loadingScans: "Cargando escaneos recientes..."
  },
  hi: {
    starters: [
      "इस पत्ते के पैटर्न का आमतौर पर क्या मतलब होता है?",
      "मुझे इस हफ्ते अर्ली ब्लाइट का इलाज कैसे करना चाहिए?",
      "स्प्रे करने के बाद मुझे क्या मॉनिटर करना चाहिए?"
    ],
    timeoutError: "सहायक को जवाब देने में बहुत समय लगा। कृपया छोटा प्रश्न पूछें।",
    networkError: "अभी चैट सेवा तक पहुंच नहीं हो सकी। कुछ सेकंड बाद फिर कोशिश करें।",
    newChat: "नया चैट",
    recentScans: "हाल के स्कैन",
    noScans: "अभी कोई स्कैन इतिहास नहीं है। सहायक फिर भी सामान्य सलाह दे सकता है।",
    usingContext: "स्कैन का संदर्भ उपयोग हो रहा है",
    withoutContext: "सामान्य सलाह मोड",
    chatMemory: "सहायक इस सत्र की हाल की बातचीत याद रखता है।",
    starterTitle: "इनमें से एक प्रश्न आज़माएँ",
    loadingScans: "हाल के स्कैन लोड हो रहे हैं..."
  },
  zh: {
    starters: [
      "这种叶片纹理通常意味着什么？",
      "这周我应该如何处理早疫病？",
      "喷洒之后我应该重点观察什么？"
    ],
    timeoutError: "助手响应时间过长。请尝试更短的问题。",
    networkError: "当前无法连接聊天服务。请稍后几秒再试。",
    newChat: "新对话",
    recentScans: "最近扫描",
    noScans: "还没有扫描历史，但助手仍可回答一般性农业问题。",
    usingContext: "正在使用扫描上下文",
    withoutContext: "通用建议模式",
    chatMemory: "助手会记住本次会话中最近的对话内容。",
    starterTitle: "可以试试这些问题",
    loadingScans: "正在加载最近扫描..."
  }
};

export interface ChatMessage {
  id: string;
  content: string;
  sender: "user" | "assistant";
  timestamp: Date;
}

type StoredChatState = {
  messages?: Array<{
    id: string;
    content: string;
    sender: "user" | "assistant";
    timestamp: string;
  }>;
  selectedScanId?: string | null;
};

const CHAT_STORAGE_KEY = "plantify-chat-session-v2";

function serializeScanContext(scan: ScanHistory | null) {
  if (!scan) {
    return null;
  }

  return {
    disease_name: scan.disease,
    disease_type: scan.disease_type,
    plant_name: scan.plant_name,
    confidence: scan.confidence_score,
    recommendation: scan.recommendation,
  };
}

function formatScanTimestamp(scan: ScanHistory, locale: AppLocale) {
  return new Date(scan.created_at).toLocaleString(locale, {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function ChatInterface() {
  const t = useTranslations("chat");
  const locale = useLocale() as AppLocale;
  const copy = CHAT_INTERFACE_COPY[locale] ?? CHAT_INTERFACE_COPY.en;
  const isRTL = locale === "ar";
  const chatStreamUrl = `${getApiUrl()}/chat/stream`;

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [recentScans, setRecentScans] = useState<ScanHistory[]>([]);
  const [selectedScanId, setSelectedScanId] = useState<string | null>(null);
  const [isLoadingScans, setIsLoadingScans] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const selectedScan = useMemo(
    () => recentScans.find((scan) => scan.id === selectedScanId) ?? recentScans[0] ?? null,
    [recentScans, selectedScanId]
  );

  const applyStarterPrompt = (prompt: string) => {
    setInput(prompt);
    textareaRef.current?.focus();
  };

  const formatChatError = (err: unknown): string => {
    if (err instanceof DOMException && err.name === "AbortError") {
      return copy.timeoutError;
    }
    if (err instanceof Error) {
      const lower = err.message.toLowerCase();
      if (lower.includes("failed to fetch") || lower.includes("network")) {
        return copy.networkError;
      }
      return err.message;
    }
    return copy.networkError;
  };

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
      if (!raw) return;
      const parsed = JSON.parse(raw) as StoredChatState;

      if (Array.isArray(parsed.messages)) {
        setMessages(
          parsed.messages
            .filter((item) => item && (item.sender === "user" || item.sender === "assistant") && typeof item.content === "string")
            .map((item) => ({
              id: item.id,
              content: item.content,
              sender: item.sender,
              timestamp: new Date(item.timestamp),
            }))
        );
      }

      if (typeof parsed.selectedScanId === "string" || parsed.selectedScanId === null) {
        setSelectedScanId(parsed.selectedScanId);
      }
    } catch {
      // Ignore corrupted cache.
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      CHAT_STORAGE_KEY,
      JSON.stringify({
        messages: messages.map((message) => ({
          ...message,
          timestamp: message.timestamp.toISOString(),
        })),
        selectedScanId,
      } satisfies StoredChatState)
    );
  }, [messages, selectedScanId]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  }, [input]);

  useEffect(() => {
    let ignore = false;

    const loadRecentScans = async () => {
      const token = getStoredAccessToken();
      if (!token) {
        setRecentScans([]);
        setIsLoadingScans(false);
        return;
      }

      try {
        const rows = await fetchHistory(token);
        if (!ignore) {
          const nextScans = rows.slice(0, 6);
          setRecentScans(nextScans);
          setSelectedScanId((current) => current ?? nextScans[0]?.id ?? null);
        }
      } catch {
        if (!ignore) {
          setRecentScans([]);
        }
      } finally {
        if (!ignore) {
          setIsLoadingScans(false);
        }
      }
    };

    void loadRecentScans();
    return () => {
      ignore = true;
    };
  }, []);

  const resetConversation = () => {
    setMessages([]);
    setError(null);
    window.localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const handleSendMessage = async () => {
    if (!input.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      content: input.trim(),
      sender: "user",
      timestamp: new Date(),
    };

    const priorMessages = messages.slice(-6).map((message) => ({
      role: message.sender,
      content: message.content,
    }));

    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setIsLoading(true);

    try {
      const controller = new AbortController();
      const timeoutId = window.setTimeout(() => controller.abort(), 65000);

      const response = await fetch(chatStreamUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Accept": "text/event-stream",
        },
        signal: controller.signal,
        body: JSON.stringify({
          message: userMessage.content,
          scan_context: serializeScanContext(selectedScan),
          conversation_history: priorMessages,
        }),
      });

      window.clearTimeout(timeoutId);

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No response body");

      const assistantMessage: ChatMessage = {
        id: `${Date.now()}-assistant`,
        content: "",
        sender: "assistant",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);

      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6).trimEnd();
          if (!data || data === "[DONE]") continue;

          setMessages((prev) => {
            const updated = [...prev];
            const lastMessage = updated[updated.length - 1];
            if (lastMessage && lastMessage.sender === "assistant") {
              lastMessage.content += data;
            }
            return updated;
          });
        }
      }

      setIsLoading(false);
    } catch (err) {
      setError(formatChatError(err));
      setIsLoading(false);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last?.sender === "assistant" && last.content.length === 0) {
          return prev.slice(0, -1);
        }
        return prev;
      });
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      void handleSendMessage();
    }
  };

  return (
    <div className={`grid h-full min-h-0 bg-background ${isRTL ? "rtl" : "ltr"} lg:grid-cols-[320px,1fr]`} dir={isRTL ? "rtl" : "ltr"}>
      <aside className="hidden min-h-0 border-e border-border/50 bg-card/50 lg:flex lg:flex-col">
        <div className="border-b border-border/50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{copy.recentScans}</p>
              <p className="mt-1 text-xs text-muted-foreground">{copy.chatMemory}</p>
            </div>
            <Button type="button" variant="secondary" size="sm" onClick={resetConversation}>
              <RotateCcw className="h-4 w-4" />
              {copy.newChat}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {isLoadingScans ? (
            <div className="rounded-2xl border border-border bg-background px-4 py-5 text-sm text-muted-foreground">
              {copy.loadingScans}
            </div>
          ) : recentScans.length === 0 ? (
            <div className="rounded-2xl border border-dashed border-border bg-background px-4 py-5 text-sm text-muted-foreground">
              {copy.noScans}
            </div>
          ) : (
            recentScans.map((scan) => {
              const isActive = selectedScan?.id === scan.id;
              return (
                <button
                  key={scan.id}
                  type="button"
                  onClick={() => setSelectedScanId(scan.id)}
                  className={`w-full rounded-2xl border px-4 py-3 text-left transition ${isActive ? "border-emerald-500/35 bg-emerald-500/10" : "border-border bg-background hover:border-emerald-500/20"}`}
                >
                  <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-300">
                    <Leaf className="h-4 w-4" />
                    <span className="text-xs font-semibold uppercase tracking-[0.16em]">{scan.plant_name}</span>
                  </div>
                  <p className="mt-2 line-clamp-2 text-sm font-semibold text-foreground">{scan.disease}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{formatScanTimestamp(scan, locale)}</p>
                  <div className="mt-3 flex items-center justify-between text-xs">
                    <span className="rounded-full bg-black/5 px-2 py-1 text-muted-foreground dark:bg-white/5">
                      {(scan.confidence_score * 100).toFixed(1)}%
                    </span>
                    {isActive ? <span className="font-semibold text-emerald-700 dark:text-emerald-300">{copy.usingContext}</span> : null}
                  </div>
                </button>
              );
            })
          )}
        </div>
      </aside>

      <div className="flex min-h-0 flex-col">
        <div className="border-b border-border/50 bg-card/50 px-3 py-3 sm:px-6">
          <div className="mx-auto flex max-w-4xl flex-wrap items-center justify-between gap-3">
            <div className="min-w-0">
              <div className="inline-flex items-center gap-2 rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-emerald-700 dark:text-emerald-300">
                <Bot className="h-3.5 w-3.5" />
                {selectedScan ? copy.usingContext : copy.withoutContext}
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                {selectedScan
                  ? `${selectedScan.plant_name} • ${selectedScan.disease} • ${(selectedScan.confidence_score * 100).toFixed(1)}%`
                  : copy.noScans}
              </p>
            </div>

            <Button type="button" variant="secondary" size="sm" className="lg:hidden" onClick={resetConversation}>
              <RotateCcw className="h-4 w-4" />
              {copy.newChat}
            </Button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-3 py-3 sm:px-6 sm:py-4">
          <div className="mx-auto max-w-4xl space-y-4">
            {messages.length === 0 && (
              <div className="flex min-h-full items-center justify-center py-8 text-center">
                <div className="w-full max-w-2xl">
                  <div className="mx-auto mb-5 h-16 w-16 rounded-full border border-emerald-500/15 bg-emerald-500/10 p-4 text-emerald-600 dark:text-emerald-300">
                    <div className="grid h-full w-full grid-cols-2 gap-1.5">
                      <span className="rounded-full bg-current/80" />
                      <span className="rounded-full bg-current/55" />
                      <span className="rounded-full bg-current/55" />
                      <span className="rounded-full bg-current/80" />
                    </div>
                  </div>

                  <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-border bg-background px-3 py-1 text-xs text-muted-foreground">
                    <History className="h-3.5 w-3.5" />
                    {copy.chatMemory}
                  </div>

                  <p className="mb-4 text-sm font-semibold text-foreground">{copy.starterTitle}</p>

                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {copy.starters.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => applyStarterPrompt(prompt)}
                        className="rounded-full border border-border bg-background px-4 py-2 text-sm text-muted-foreground transition hover:border-emerald-500/35 hover:text-foreground"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {messages.map((msg) => (
              <div key={msg.id} className={`flex ${msg.sender === "user" ? "justify-end" : "justify-start"}`}>
                <div
                  className={`max-w-[85%] rounded-lg px-4 py-3 sm:max-w-xl ${
                    msg.sender === "user"
                      ? "rounded-br-none bg-primary text-white"
                      : "rounded-bl-none bg-secondary text-foreground"
                  }`}
                >
                  <p className="whitespace-pre-wrap break-words">{msg.content}</p>
                  <span className="mt-1 block text-xs opacity-70">
                    {msg.timestamp.toLocaleTimeString(locale, {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="flex justify-start">
                <div className="rounded-lg rounded-bl-none bg-secondary px-4 py-3 text-foreground">
                  <div className="flex space-x-2">
                    <div className="h-2 w-2 animate-bounce rounded-full bg-current" />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-current" style={{ animationDelay: "0.1s" }} />
                    <div className="h-2 w-2 animate-bounce rounded-full bg-current" style={{ animationDelay: "0.2s" }} />
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <div className="max-w-[85%] rounded-lg border border-destructive/30 bg-destructive/20 px-4 py-3 text-destructive sm:max-w-xl">
                  <p className="text-sm">{t("error")}: {error}</p>
                </div>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        </div>

        <div className="border-t border-border/50 bg-card/50 px-3 py-3 sm:px-6 sm:py-4">
          <div className="mx-auto w-full max-w-4xl">
            <div className="flex gap-3">
              <textarea
                ref={textareaRef}
                value={input}
                onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder={t("inputPlaceholder")}
                disabled={isLoading}
                className="flex-1 resize-none rounded-xl border border-border bg-black/30 px-3 py-2 text-sm text-foreground outline-none placeholder:text-muted-foreground focus:border-primary disabled:cursor-not-allowed disabled:opacity-50"
                rows={1}
              />
              <Button onClick={() => void handleSendMessage()} disabled={isLoading || !input.trim()} className="self-end h-10">
                {isLoading ? t("sending") : (
                  <>
                    <Sparkles className="h-4 w-4" />
                    {t("send")}
                  </>
                )}
              </Button>
            </div>
            <p className="mt-2 text-xs text-muted-foreground">{t("hint")}</p>
          </div>
        </div>
      </div>
    </div>
  );
}
