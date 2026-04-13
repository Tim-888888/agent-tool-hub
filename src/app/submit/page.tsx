"use client";

import { useState, type KeyboardEvent } from "react";
import Header from "@/components/layout/Header";
import Footer from "@/components/layout/Footer";
import { useI18n } from "@/lib/i18n-context";

export default function SubmitPage() {
  const { locale, t } = useI18n();
  const [repoUrl, setRepoUrl] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [notes, setNotes] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [submitted, setSubmitted] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function handleTagKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (tag && !tags.includes(tag)) {
        setTags((prev) => [...prev, tag]);
      }
      setTagInput("");
    }
  }

  function removeTag(tagToRemove: string) {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  }

  function validate(): boolean {
    const newErrors: Record<string, string> = {};
    if (!repoUrl.trim()) {
      newErrors.repoUrl = locale === "zh" ? "请输入 GitHub 仓库地址" : "GitHub repository URL is required";
    } else if (
      !/^https?:\/\/(www\.)?github\.com\/.+/.test(repoUrl.trim())
    ) {
      newErrors.repoUrl = locale === "zh" ? "请输入有效的 GitHub 仓库地址" : "Please enter a valid GitHub repository URL";
    }
    if (email.trim() && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) {
      newErrors.email = locale === "zh" ? "请输入有效的邮箱地址" : "Please enter a valid email address";
    }
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  function handleSubmit() {
    if (!validate()) return;
    setSubmitted(true);
  }

  if (submitted) {
    return (
      <>
        <Header />
        <main className="flex-1">
          <div className="mx-auto flex max-w-2xl flex-col items-center justify-center px-4 py-24 text-center sm:px-6">
            <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-full bg-[var(--color-success)]/10">
              <svg
                className="h-10 w-10 text-[var(--color-success)]"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-[var(--text-primary)]">
              {t("submit.success")}
            </h1>
            <p className="mt-3 text-[var(--text-secondary)]">
              {locale === "zh" ? "我们会审核你提交的工具，尽快加入目录。" : "We will review your tool and add it to the directory soon."}
            </p>
            <button
              onClick={() => {
                setSubmitted(false);
                setRepoUrl("");
                setName("");
                setEmail("");
                setNotes("");
                setTags([]);
                setErrors({});
              }}
              className="mt-8 rounded-full bg-[var(--color-accent)] px-6 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-[var(--color-accent-hover)]"
            >
              {locale === "zh" ? "继续提交" : "Submit Another Tool"}
            </button>
          </div>
        </main>
        <Footer />
      </>
    );
  }

  return (
    <>
      <Header />
      <main className="flex-1">
        {/* Page Header */}
        <section className="border-b border-[var(--border)] bg-[var(--bg-secondary)] transition-theme">
          <div className="mx-auto max-w-2xl px-4 py-12 sm:px-6">
            <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)] sm:text-4xl">
              {t("submit.title")}
            </h1>
            <p className="mt-3 text-lg text-[var(--text-secondary)]">
              {locale === "zh"
                ? "发现了一个应该被收录的 MCP 服务器、Skill 或 Rule？在这里提交，我们会审核后加入目录。"
                : "Know an MCP Server, Skill, or Rule that should be listed? Submit it here and we will review it for inclusion."}
            </p>
          </div>
        </section>

        {/* Form */}
        <section className="py-8">
          <div className="mx-auto max-w-2xl px-4 sm:px-6">
            <div className="space-y-6">
              {/* GitHub Repository URL */}
              <div>
                <label
                  htmlFor="repoUrl"
                  className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
                >
                  {t("submit.repoUrl")} <span className="text-[var(--color-danger)]">*</span>
                </label>
                <input
                  id="repoUrl"
                  type="url"
                  value={repoUrl}
                  onChange={(e) => setRepoUrl(e.target.value)}
                  placeholder={t("submit.repoUrlPlaceholder")}
                  className={`w-full rounded-xl border bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-all focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 ${
                    errors.repoUrl
                      ? "border-[var(--color-danger)]"
                      : "border-[var(--border)]"
                  }`}
                />
                {errors.repoUrl && (
                  <p className="mt-1.5 text-xs text-[var(--color-danger)]">
                    {errors.repoUrl}
                  </p>
                )}
              </div>

              {/* Your Name */}
              <div>
                <label
                  htmlFor="name"
                  className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
                >
                  {t("submit.name")}
                </label>
                <input
                  id="name"
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Jane Doe"
                  className="w-full rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-all focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
                />
              </div>

              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
                >
                  {t("submit.email")}
                </label>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="jane@example.com"
                  className={`w-full rounded-xl border bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-all focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20 ${
                    errors.email
                      ? "border-[var(--color-danger)]"
                      : "border-[var(--border)]"
                  }`}
                />
                {errors.email && (
                  <p className="mt-1.5 text-xs text-[var(--color-danger)]">
                    {errors.email}
                  </p>
                )}
              </div>

              {/* Additional Notes */}
              <div>
                <label
                  htmlFor="notes"
                  className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
                >
                  {t("submit.notes")}{" "}
                  <span className="text-[var(--text-tertiary)]">{locale === "zh" ? "（可选）" : "(optional)"}</span>
                </label>
                <textarea
                  id="notes"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={locale === "zh" ? "关于这个工具的补充说明..." : "Anything we should know about this tool..."}
                  rows={4}
                  className="w-full resize-none rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-4 py-3 text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none transition-all focus:border-[var(--color-accent)] focus:ring-2 focus:ring-[var(--color-accent)]/20"
                />
              </div>

              {/* Suggested Tags */}
              <div>
                <label
                  htmlFor="tags"
                  className="mb-2 block text-sm font-medium text-[var(--text-primary)]"
                >
                  {t("submit.tags")}{" "}
                  <span className="text-[var(--text-tertiary)]">
                    {locale === "zh" ? "（按回车添加）" : "(press Enter to add)"}
                  </span>
                </label>
                <div className="flex flex-wrap items-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] px-3 py-2 transition-all focus-within:border-[var(--color-accent)] focus-within:ring-2 focus-within:ring-[var(--color-accent)]/20">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="flex items-center gap-1 rounded-lg bg-[var(--color-accent)]/10 px-2.5 py-1 text-xs font-medium text-[var(--color-accent)]"
                    >
                      {tag}
                      <button
                        type="button"
                        onClick={() => removeTag(tag)}
                        className="ml-0.5 rounded-full p-0.5 transition-colors hover:bg-[var(--color-accent)]/20"
                        aria-label={`Remove tag ${tag}`}
                      >
                        <svg
                          className="h-3 w-3"
                          fill="none"
                          viewBox="0 0 24 24"
                          strokeWidth={2}
                          stroke="currentColor"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M6 18L18 6M6 6l12 12"
                          />
                        </svg>
                      </button>
                    </span>
                  ))}
                  <input
                    id="tags"
                    type="text"
                    value={tagInput}
                    onChange={(e) => setTagInput(e.target.value)}
                    onKeyDown={handleTagKeyDown}
                    placeholder={tags.length === 0 ? (locale === "zh" ? "输入标签后按回车..." : "Type a tag and press Enter...") : ""}
                    className="min-w-[120px] flex-1 bg-transparent text-sm text-[var(--text-primary)] placeholder:text-[var(--text-tertiary)] outline-none"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                className="w-full rounded-xl bg-[var(--color-accent)] px-6 py-3.5 text-sm font-semibold text-white transition-all hover:bg-[var(--color-accent-hover)] active:scale-[0.98] sm:w-auto"
              >
                {t("submit.submit")}
              </button>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
