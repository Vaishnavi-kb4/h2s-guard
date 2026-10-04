import { createFileRoute } from "@tanstack/react-router";
import { Send, ShieldCheck, Sparkles, UserRound, Globe } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { PageHeader, Panel } from "@/components/h2s/common";
import { measurements } from "@/data/mockData";
import {
  generateMultilingualAnswer,
  getGreetingMessage,
  getSuggestedQuestions,
} from "@/services/multilingualAssistant";

import { useApp } from "@/context/AppContext";
import { translations, type SupportedLanguage } from "@/lib/translations";

export const Route = createFileRoute("/assistant")({
  head: () => ({
    meta: [
      { title: "Multilingual HSE Assistant — H₂S GUARD" },
      { name: "description", content: "Multilingual assistant for explaining verified demo records in English, Tamil, Hindi, and Kannada." },
    ],
  }),
  component: AssistantPage,
});

function AssistantPage() {
  const { language, setLanguage } = useApp();
  const t = translations[language] || translations.English;
  const [input, setInput] = useState("");

  const latestMeas = measurements[0];
  const ctx = {
    latestExposure: latestMeas ? `${latestMeas.exposure} ppm·h` : "2.1 ppm·h",
    twaPpm: 0.26,
    duration: 8,
    workerId: latestMeas?.workerId || "W-102",
    status: latestMeas?.status || "VALID",
  };

  const [messages, setMessages] = useState<{ role: "user" | "assistant"; text: string }[]>([
    { role: "assistant", text: getGreetingMessage(language) },
  ]);

  const handleLanguageChange = (newLang: SupportedLanguage) => {
    setLanguage(newLang);
    setMessages((prev) => [
      ...prev,
      { role: "assistant", text: `🌐 ${newLang}: ${getGreetingMessage(newLang)}` },
    ]);
  };

  const ask = (q = input) => {
    if (!q.trim()) return;
    const ansText = generateMultilingualAnswer(q, language, ctx);
    setMessages((prev) => [
      ...prev,
      { role: "user", text: q },
      { role: "assistant", text: ansText },
    ]);
    setInput("");
  };

  const currentSuggestions = getSuggestedQuestions(language);

  return (
    <>
      <PageHeader
        title="Multilingual HSE Assistant"
        subtitle="Ask about verified measurements and approved safety guidance in English, தமிழ் (Tamil), हिन्दी (Hindi), and கன்னட (Kannada)."
      />

      <div className="grid gap-5 xl:grid-cols-[1fr_340px]">
        <Panel className="flex min-h-[620px] flex-col p-5">
          {/* Language Selector Header */}
          <div className="flex flex-wrap items-center justify-between border-b border-border pb-3 mb-4 gap-2">
            <div className="flex items-center gap-2">
              <Globe className="size-4 text-primary" />
              <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Select Response Language:</span>
            </div>

            <div className="flex gap-1.5 text-xs font-bold bg-muted p-1 rounded-xl">
              {(["English", "தமிழ்", "हिंदी", "ಕನ್ನಡ", "മലയാളം"] as SupportedLanguage[]).map((lang) => (
                <button
                  key={lang}
                  type="button"
                  onClick={() => handleLanguageChange(lang)}
                  className={`px-3 py-1 rounded-lg transition ${
                    language === lang
                      ? "bg-primary text-primary-foreground shadow-xs"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  {lang}
                </button>
              ))}
            </div>
          </div>

          <div className="flex-1 space-y-4 overflow-auto pr-1">
            {messages.map((m, i) => (
              <div key={i} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-primary-soft text-primary">
                    <ShieldCheck className="size-5" />
                  </span>
                )}
                <div
                  className={`max-w-[78%] rounded-xl p-3.5 text-sm whitespace-pre-wrap leading-relaxed ${
                    m.role === "user"
                      ? "bg-primary text-primary-foreground font-semibold"
                      : "border border-border bg-muted/60 font-medium"
                  }`}
                >
                  {m.text}
                </div>
                {m.role === "user" && (
                  <span className="grid size-8 shrink-0 place-items-center rounded-full bg-secondary text-secondary-foreground font-bold text-xs">
                    <UserRound className="size-4" />
                  </span>
                )}
              </div>
            ))}
          </div>

          <div className="mt-5 flex gap-2 border-t border-border pt-4">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && ask()}
              placeholder={
                language === "தமிழ்"
                  ? "H₂S அளவீடு பற்றி கேளுங்கள்..."
                  : language === "हिंदी"
                  ? "H₂S माप के बारे में पूछें..."
                  : language === "ಕನ್ನಡ"
                  ? "H₂S ಅಳತೆಯ ಬಗ್ಗೆ ಕೇಳಿ..."
                  : language === "മലയാളം"
                  ? "H₂S അളവിനെക്കുറിച്ച് ചോദിക്കുക..."
                  : "Ask about a measurement or safety procedures..."
              }
              className="h-11 text-xs"
            />
            <Button onClick={() => ask()} aria-label="Send question" className="h-11 px-5">
              <Send className="size-4" />
            </Button>
          </div>
        </Panel>

        <Panel className="p-5">
          <div className="flex items-center gap-2 font-bold text-sm">
            <Sparkles className="size-4 text-primary" /> Suggested Questions ({language})
          </div>

          <div className="mt-4 space-y-2">
            {currentSuggestions.map((item) => (
              <button
                key={item.key}
                onClick={() => ask(item.label)}
                className="w-full rounded-xl border border-border p-3 text-left text-xs font-semibold hover:border-primary hover:bg-primary-soft transition-all"
              >
                {item.label}
              </button>
            ))}
          </div>

          <div className="mt-6 rounded-xl border border-warning/30 bg-warning-soft p-3 text-xs font-semibold text-warning-foreground">
            <b>Multilingual Knowledge Base:</b> Translates verified measurement details, exposure calculations, and safety procedures into English, Tamil, Hindi, and Kannada.
          </div>
        </Panel>
      </div>
    </>
  );
}
