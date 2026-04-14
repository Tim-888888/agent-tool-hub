"use client";

import { useState } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useI18n, localePath } from "@/lib/i18n-context";
import { formatStars } from "@/lib/utils";

type Step = 1 | 2 | 3 | 4 | "result";

interface Recommendation {
  id: string;
  name: string;
  description: string | null;
  type: string;
  stars: number;
  slug?: string;
  reason: string;
  matchScore: number;
}

const LANGUAGES = [
  { value: "TypeScript", label: "TypeScript" },
  { value: "Python", label: "Python" },
  { value: "Go", label: "Go" },
  { value: "Rust", label: "Rust" },
  { value: "Java", label: "Java" },
  { value: "Other", labelEn: "Other", labelZh: "其他" },
];

const USE_CASES = [
  { value: "Web Development", labelEn: "Web Development", labelZh: "Web 开发" },
  { value: "API Integration", labelEn: "API Integration", labelZh: "API 集成" },
  { value: "Data Analysis", labelEn: "Data Analysis", labelZh: "数据分析" },
  { value: "Automation", labelEn: "Automation", labelZh: "自动化" },
  { value: "Security Testing", labelEn: "Security Testing", labelZh: "安全测试" },
  { value: "Code Generation", labelEn: "Code Generation", labelZh: "代码生成" },
];

const AGENT_TOOLS = [
  "Claude Code",
  "Cursor",
  "Cline",
  "OpenClaw",
  "Windsurf",
  "Other",
];

function getTypeColor(type: string): string {
  switch (type) {
    case "MCP_SERVER": return "#3b82f6";
    case "SKILL": return "#8b5cf6";
    case "RULE": return "#f59e0b";
    default: return "#6e6e73";
  }
}

function getTypeLabel(type: string): string {
  switch (type) {
    case "MCP_SERVER": return "MCP";
    case "SKILL": return "Skill";
    case "RULE": return "Rule";
    default: return type;
  }
}

export default function MatchClient() {
  const { locale, t } = useI18n();
  const [step, setStep] = useState<Step>(1);
  const [languages, setLanguages] = useState<string[]>([]);
  const [useCases, setUseCases] = useState<string[]>([]);
  const [agentTool, setAgentTool] = useState("");
  const [budget, setBudget] = useState("free");
  const [results, setResults] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(false);

  const toggleMulti = (arr: string[], value: string, setter: (v: string[]) => void) => {
    setter(arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value]);
  };

  const handleMatch = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/tools/match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ languages, useCases, agentTool, budget }),
      });
      const json = await res.json();
      if (json.success) {
        setResults(json.data);
        setStep("result");
      }
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  };

  const stepTitles: Record<Step, string> = {
    1: locale === "zh" ? "你的编程语言？" : "Your programming languages?",
    2: locale === "zh" ? "你的使用场景？" : "Your use cases?",
    3: locale === "zh" ? "你用的 AI 工具？" : "Your AI agent tool?",
    4: locale === "zh" ? "预算偏好？" : "Budget preference?",
    result: locale === "zh" ? "推荐结果" : "Recommendations",
  };

  const canProceed = () => {
    switch (step) {
      case 1: return languages.length > 0;
      case 2: return useCases.length > 0;
      case 3: return agentTool !== "";
      case 4: return true;
      default: return false;
    }
  };

  const nextStep = () => {
    if (step === 1) setStep(2);
    else if (step === 2) setStep(3);
    else if (step === 3) setStep(4);
    else if (step === 4) handleMatch();
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-500";
    if (score >= 60) return "text-amber-500";
    return "text-[var(--text-tertiary)]";
  };

  return (
    <>
      <Header />
      <main className="flex-1">
        <section className="border-b border-[var(--border)] bg-[var(--bg-secondary)] transition-theme">
          <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6 lg:px-8">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {t("match.title")}
            </h1>
            <p className="mt-3 text-lg text-[var(--text-secondary)]">
              {t("match.description")}
            </p>
          </div>
        </section>

        {/* Progress bar */}
        <div className="border-b border-[var(--border)]">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-2 py-3">
              {([1, 2, 3, 4] as const).map((s) => (
                <div
                  key={s}
                  className={`h-1.5 flex-1 rounded-full transition-colors ${
                    (typeof step === "number" && step >= s) || step === "result"
                      ? "bg-[var(--color-accent)]"
                      : "bg-[var(--bg-tertiary)]"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        <section className="py-8">
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <h2 className="mb-6 text-xl font-semibold text-[var(--text-primary)]">
              {stepTitles[step]}
            </h2>

            {step === 1 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {LANGUAGES.map((lang) => (
                  <button
                    key={lang.value}
                    onClick={() => toggleMulti(languages, lang.value, setLanguages)}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                      languages.includes(lang.value)
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--color-accent)]/50"
                    }`}
                  >
                    {lang.label || (locale === "zh" ? lang.labelZh : lang.labelEn)}
                  </button>
                ))}
              </div>
            )}

            {step === 2 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {USE_CASES.map((uc) => (
                  <button
                    key={uc.value}
                    onClick={() => toggleMulti(useCases, uc.value, setUseCases)}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                      useCases.includes(uc.value)
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--color-accent)]/50"
                    }`}
                  >
                    {locale === "zh" ? uc.labelZh : uc.labelEn}
                  </button>
                ))}
              </div>
            )}

            {step === 3 && (
              <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {AGENT_TOOLS.map((tool) => (
                  <button
                    key={tool}
                    onClick={() => setAgentTool(tool)}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                      agentTool === tool
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--color-accent)]/50"
                    }`}
                  >
                    {tool}
                  </button>
                ))}
              </div>
            )}

            {step === 4 && (
              <div className="grid grid-cols-2 gap-3">
                {[
                  { value: "free", labelEn: "Free only", labelZh: "仅免费" },
                  { value: "any", labelEn: "Free or paid", labelZh: "免费或付费" },
                ].map((b) => (
                  <button
                    key={b.value}
                    onClick={() => setBudget(b.value)}
                    className={`rounded-xl border px-4 py-3 text-sm font-medium transition-all ${
                      budget === b.value
                        ? "border-[var(--color-accent)] bg-[var(--color-accent)]/10 text-[var(--color-accent)]"
                        : "border-[var(--border)] text-[var(--text-secondary)] hover:border-[var(--color-accent)]/50"
                    }`}
                  >
                    {locale === "zh" ? b.labelZh : b.labelEn}
                  </button>
                ))}
              </div>
            )}

            {step === "result" && (
              <div className="space-y-4">
                {results.length === 0 ? (
                  <p className="py-8 text-center text-[var(--text-secondary)]">
                    {t("match.noResults")}
                  </p>
                ) : (
                  results.map((rec) => (
                    <div
                      key={rec.id}
                      className="rounded-2xl border border-[var(--border)] bg-[var(--bg-primary)] p-5"
                    >
                      <div className="flex items-start justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-lg font-semibold text-[var(--text-primary)]">
                              {rec.name}
                            </h3>
                            <span
                              className="rounded-md px-1.5 py-0.5 text-xs font-medium"
                              style={{
                                backgroundColor: `${getTypeColor(rec.type)}15`,
                                color: getTypeColor(rec.type),
                              }}
                            >
                              {getTypeLabel(rec.type)}
                            </span>
                          </div>
                          <p className="mt-1 text-sm text-[var(--text-secondary)]">
                            {rec.description}
                          </p>
                          <p className="mt-2 text-sm text-[var(--color-accent)]">
                            {rec.reason}
                          </p>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <span className={`text-2xl font-bold ${getScoreColor(rec.matchScore)}`}>
                            {rec.matchScore}%
                          </span>
                          <span className="text-xs text-[var(--text-tertiary)]">
                            {locale === "zh" ? "匹配度" : "match"}
                          </span>
                          <span className="text-xs text-[var(--text-tertiary)]">
                            ★ {formatStars(rec.stars)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ))
                )}
                <button
                  onClick={() => { setStep(1); setLanguages([]); setUseCases([]); setAgentTool(""); }}
                  className="mt-4 text-sm font-medium text-[var(--color-accent)] hover:underline"
                >
                  {locale === "zh" ? "重新开始" : "Start over"}
                </button>
              </div>
            )}

            {step !== "result" && (
              <div className="mt-8 flex justify-between">
                <button
                  onClick={() => {
                    if (step === 2) setStep(1);
                    else if (step === 3) setStep(2);
                    else if (step === 4) setStep(3);
                  }}
                  className={`rounded-lg px-4 py-2 text-sm font-medium ${
                    step === 1
                      ? "invisible"
                      : "text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
                  }`}
                >
                  {locale === "zh" ? "上一步" : "Back"}
                </button>
                <button
                  onClick={nextStep}
                  disabled={!canProceed() || loading}
                  className="rounded-lg bg-[var(--color-accent)] px-6 py-2 text-sm font-medium text-white hover:opacity-90 disabled:opacity-50"
                >
                  {loading
                    ? (locale === "zh" ? "匹配中..." : "Matching...")
                    : step === 4
                      ? (locale === "zh" ? "查看推荐" : "Get Recommendations")
                      : (locale === "zh" ? "下一步" : "Next")}
                </button>
              </div>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
