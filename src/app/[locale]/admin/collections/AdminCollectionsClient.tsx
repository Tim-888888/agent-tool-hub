"use client";

import { useState, useEffect, useCallback } from "react";
import { useI18n } from "@/lib/i18n-context";

interface Collection {
  id: string;
  slug: string;
  titleEn: string;
  titleZh: string;
  descriptionEn: string | null;
  descriptionZh: string | null;
  icon: string | null;
  isPublished: boolean;
  sortOrder: number;
  toolCount: number;
}

interface Tool {
  id: string;
  slug: string;
  name: string;
  type: string;
  stars: number;
}

type ModalMode = "create" | "edit" | null;

export default function AdminCollectionsClient() {
  const { locale } = useI18n();
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalMode, setModalMode] = useState<ModalMode>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState({
    slug: "",
    titleEn: "",
    titleZh: "",
    descriptionEn: "",
    descriptionZh: "",
    icon: "",
    isPublished: false,
    sortOrder: 0,
  });

  // Add/remove tool modal
  const [toolModal, setToolModal] = useState<string | null>(null); // collection id
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<Tool[]>([]);
  const [collectionTools, setCollectionTools] = useState<Tool[]>([]);

  const fetchCollections = useCallback(async () => {
    try {
      const res = await fetch("/api/admin/collections");
      const json = await res.json();
      if (json.success) setCollections(json.data);
    } catch {
      // handle
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchCollections();
  }, [fetchCollections]);

  const openCreate = () => {
    setForm({ slug: "", titleEn: "", titleZh: "", descriptionEn: "", descriptionZh: "", icon: "", isPublished: false, sortOrder: 0 });
    setModalMode("create");
  };

  const openEdit = (c: Collection) => {
    setEditingId(c.id);
    setForm({
      slug: c.slug,
      titleEn: c.titleEn,
      titleZh: c.titleZh,
      descriptionEn: c.descriptionEn || "",
      descriptionZh: c.descriptionZh || "",
      icon: c.icon || "",
      isPublished: c.isPublished,
      sortOrder: c.sortOrder,
    });
    setModalMode("edit");
  };

  const handleSubmit = async () => {
    const url = modalMode === "create" ? "/api/admin/collections" : `/api/admin/collections/${editingId}`;
    const method = modalMode === "create" ? "POST" : "PUT";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    const json = await res.json();
    if (json.success) {
      setModalMode(null);
      fetchCollections();
    } else {
      alert(json.error || "Failed");
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm(locale === "zh" ? "确定删除此合集？" : "Delete this collection?")) return;
    const res = await fetch(`/api/admin/collections/${id}`, { method: "DELETE" });
    if (res.ok) fetchCollections();
  };

  const togglePublish = async (c: Collection) => {
    await fetch(`/api/admin/collections/${c.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isPublished: !c.isPublished }),
    });
    fetchCollections();
  };

  // Tool management
  const openToolModal = async (collectionId: string) => {
    setToolModal(collectionId);
    setSearchQuery("");
    setSearchResults([]);
    // Fetch existing tools in collection
    try {
      const slug = collections.find((c) => c.id === collectionId)?.slug;
      if (!slug) return;
      const res = await fetch(`/api/collections/${slug}`);
      const json = await res.json();
      if (json.success) {
        setCollectionTools(
          json.data.tools.map((t: { id: string; slug: string; name: string; type: string; stars: number }) => ({
            id: t.id,
            slug: t.slug,
            name: t.name,
            type: t.type,
            stars: t.stars,
          })),
        );
      }
    } catch {
      // handle
    }
  };

  const searchTools = async (q: string) => {
    setSearchQuery(q);
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    try {
      const res = await fetch(`/api/tools?q=${encodeURIComponent(q)}&limit=10`);
      const json = await res.json();
      if (json.success) setSearchResults(json.data);
    } catch {
      // handle
    }
  };

  const addToolToCollection = async (toolId: string) => {
    if (!toolModal) return;
    await fetch(`/api/admin/collections/${toolModal}/tools`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolId }),
    });
    openToolModal(toolModal);
  };

  const removeToolFromCollection = async (toolId: string) => {
    if (!toolModal) return;
    await fetch(`/api/admin/collections/${toolModal}/tools`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ toolId }),
    });
    openToolModal(toolModal);
  };

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[var(--text-primary)]">
          {locale === "zh" ? "合集管理" : "Collections"}
        </h1>
        <button
          onClick={openCreate}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
        >
          {locale === "zh" ? "新建合集" : "New Collection"}
        </button>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--color-accent)] border-t-transparent" />
        </div>
      ) : collections.length === 0 ? (
        <p className="py-12 text-center text-[var(--text-secondary)]">
          {locale === "zh" ? "暂无合集，点击上方按钮创建" : "No collections yet. Create one above."}
        </p>
      ) : (
        <div className="space-y-3">
          {collections.map((c) => (
            <div
              key={c.id}
              className="flex items-center gap-4 rounded-xl border border-[var(--border)] bg-[var(--bg-primary)] p-4"
            >
              <span className="text-2xl">{c.icon || "📦"}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-[var(--text-primary)]">
                    {locale === "zh" ? c.titleZh : c.titleEn}
                  </h3>
                  <span
                    className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      c.isPublished
                        ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                        : "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400"
                    }`}
                  >
                    {c.isPublished ? (locale === "zh" ? "已发布" : "Published") : (locale === "zh" ? "草稿" : "Draft")}
                  </span>
                </div>
                <p className="text-sm text-[var(--text-tertiary)]">
                  {c.toolCount} {locale === "zh" ? "个工具" : "tools"} · /{c.slug}
                </p>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openToolModal(c.id)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                >
                  {locale === "zh" ? "管理工具" : "Tools"}
                </button>
                <button
                  onClick={() => togglePublish(c)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                >
                  {c.isPublished ? (locale === "zh" ? "下架" : "Unpublish") : (locale === "zh" ? "发布" : "Publish")}
                </button>
                <button
                  onClick={() => openEdit(c)}
                  className="rounded-lg border border-[var(--border)] px-3 py-1.5 text-xs font-medium text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
                >
                  {locale === "zh" ? "编辑" : "Edit"}
                </button>
                <button
                  onClick={() => handleDelete(c.id)}
                  className="rounded-lg border border-red-200 px-3 py-1.5 text-xs font-medium text-red-600 hover:bg-red-50"
                >
                  {locale === "zh" ? "删除" : "Delete"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create/Edit Modal */}
      {modalMode && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="w-full max-w-lg rounded-2xl bg-[var(--bg-primary)] p-6 shadow-xl">
            <h2 className="mb-4 text-lg font-bold text-[var(--text-primary)]">
              {modalMode === "create" ? (locale === "zh" ? "新建合集" : "New Collection") : (locale === "zh" ? "编辑合集" : "Edit Collection")}
            </h2>
            <div className="space-y-3">
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Slug (url-safe)"
                  value={form.slug}
                  onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))}
                  disabled={modalMode === "edit"}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)] disabled:opacity-50"
                />
                <input
                  placeholder="Icon (emoji)"
                  value={form.icon}
                  onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <input
                  placeholder="Title (English)"
                  value={form.titleEn}
                  onChange={(e) => setForm((f) => ({ ...f, titleEn: e.target.value }))}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
                <input
                  placeholder="标题（中文）"
                  value={form.titleZh}
                  onChange={(e) => setForm((f) => ({ ...f, titleZh: e.target.value }))}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
              <textarea
                placeholder="Description (English)"
                value={form.descriptionEn}
                onChange={(e) => setForm((f) => ({ ...f, descriptionEn: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
              <textarea
                placeholder="描述（中文）"
                value={form.descriptionZh}
                onChange={(e) => setForm((f) => ({ ...f, descriptionZh: e.target.value }))}
                rows={2}
                className="w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
              <div className="grid grid-cols-2 gap-3">
                <label className="flex items-center gap-2 text-sm text-[var(--text-secondary)]">
                  <input
                    type="checkbox"
                    checked={form.isPublished}
                    onChange={(e) => setForm((f) => ({ ...f, isPublished: e.target.checked }))}
                  />
                  {locale === "zh" ? "发布" : "Published"}
                </label>
                <input
                  type="number"
                  placeholder="Sort order"
                  value={form.sortOrder}
                  onChange={(e) => setForm((f) => ({ ...f, sortOrder: parseInt(e.target.value) || 0 }))}
                  className="rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]"
                />
              </div>
            </div>
            <div className="mt-4 flex justify-end gap-2">
              <button
                onClick={() => setModalMode(null)}
                className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm text-[var(--text-secondary)] hover:bg-[var(--bg-tertiary)]"
              >
                {locale === "zh" ? "取消" : "Cancel"}
              </button>
              <button
                onClick={handleSubmit}
                className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-medium text-white hover:opacity-90"
              >
                {modalMode === "create" ? (locale === "zh" ? "创建" : "Create") : (locale === "zh" ? "保存" : "Save")}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Tool Management Modal */}
      {toolModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="max-h-[80vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-[var(--bg-primary)] p-6 shadow-xl">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-lg font-bold text-[var(--text-primary)]">
                {locale === "zh" ? "管理工具" : "Manage Tools"}
              </h2>
              <button
                onClick={() => setToolModal(null)}
                className="text-[var(--text-tertiary)] hover:text-[var(--text-primary)]"
              >
                ✕
              </button>
            </div>

            {/* Current tools */}
            <div className="mb-4">
              <h3 className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">
                {locale === "zh" ? "已添加的工具" : "Current Tools"} ({collectionTools.length})
              </h3>
              {collectionTools.length === 0 ? (
                <p className="text-sm text-[var(--text-tertiary)]">
                  {locale === "zh" ? "暂无工具" : "No tools yet"}
                </p>
              ) : (
                <div className="space-y-2">
                  {collectionTools.map((tool) => (
                    <div key={tool.id} className="flex items-center justify-between rounded-lg border border-[var(--border)] px-3 py-2">
                      <span className="text-sm font-medium text-[var(--text-primary)]">{tool.name}</span>
                      <button
                        onClick={() => removeToolFromCollection(tool.id)}
                        className="text-xs text-red-500 hover:text-red-700"
                      >
                        {locale === "zh" ? "移除" : "Remove"}
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Search to add */}
            <div>
              <h3 className="mb-2 text-sm font-semibold text-[var(--text-secondary)]">
                {locale === "zh" ? "搜索添加工具" : "Search to Add"}
              </h3>
              <input
                placeholder={locale === "zh" ? "搜索工具名称..." : "Search tools..."}
                value={searchQuery}
                onChange={(e) => searchTools(e.target.value)}
                className="mb-2 w-full rounded-lg border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-2 text-sm text-[var(--text-primary)]"
              />
              <div className="space-y-1">
                {searchResults
                  .filter((t) => !collectionTools.some((ct) => ct.id === t.id))
                  .map((tool) => (
                    <div key={tool.id} className="flex items-center justify-between rounded-lg px-3 py-2 hover:bg-[var(--bg-tertiary)]">
                      <span className="text-sm text-[var(--text-primary)]">{tool.name}</span>
                      <button
                        onClick={() => addToolToCollection(tool.id)}
                        className="text-xs font-medium text-[var(--color-accent)] hover:underline"
                      >
                        {locale === "zh" ? "添加" : "Add"}
                      </button>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
