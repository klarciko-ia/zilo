"use client";

import { AdminGuard } from "@/components/admin-guard";
import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";

type Category = { id: string; name: string; sortOrder: number };
type MenuItem = {
  id: string;
  name: string;
  description: string;
  price: number;
  imageUrl: string | null;
  categoryId: string;
  isAvailable: boolean;
};

export function AdminMenuClient() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [items, setItems] = useState<MenuItem[]>([]);
  const [loading, setLoading] = useState(true);

  const [catName, setCatName] = useState("");
  const [editingCat, setEditingCat] = useState<Category | null>(null);
  const [editCatName, setEditCatName] = useState("");

  const [showItemForm, setShowItemForm] = useState(false);
  const [editingItem, setEditingItem] = useState<MenuItem | null>(null);
  const [itemForm, setItemForm] = useState({
    name: "",
    description: "",
    price: "",
    categoryId: "",
    imageUrl: "",
    isAvailable: true,
  });
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const fetchData = useCallback(async () => {
    try {
      const [catRes, itemRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/menu-items"),
      ]);
      if (catRes.ok) {
        const c = await catRes.json();
        setCategories(c.categories ?? []);
      }
      if (itemRes.ok) {
        const i = await itemRes.json();
        setItems(i.items ?? []);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  /* ── Categories ── */

  const addCategory = async () => {
    if (!catName.trim()) return;
    setError(null);
    const res = await fetch("/api/categories", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: catName.trim() }),
    });
    if (!res.ok) {
      const e = await res.json();
      setError(e.error);
      return;
    }
    setCatName("");
    fetchData();
  };

  const saveCategory = async () => {
    if (!editingCat || !editCatName.trim()) return;
    setError(null);
    const res = await fetch(`/api/categories/${editingCat.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: editCatName.trim() }),
    });
    if (!res.ok) {
      const e = await res.json();
      setError(e.error);
      return;
    }
    setEditingCat(null);
    fetchData();
  };

  const deleteCategory = async (id: string) => {
    if (!confirm("Delete this category?")) return;
    setError(null);
    const res = await fetch(`/api/categories/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const e = await res.json();
      setError(e.error);
      return;
    }
    fetchData();
  };

  /* ── Items ── */

  const resetItemForm = () => {
    setItemForm({
      name: "",
      description: "",
      price: "",
      categoryId: categories[0]?.id ?? "",
      imageUrl: "",
      isAvailable: true,
    });
    setEditingItem(null);
    setShowItemForm(false);
  };

  const openNewItem = () => {
    resetItemForm();
    setItemForm((f) => ({ ...f, categoryId: categories[0]?.id ?? "" }));
    setShowItemForm(true);
  };

  const openEditItem = (item: MenuItem) => {
    setEditingItem(item);
    setItemForm({
      name: item.name,
      description: item.description,
      price: item.price.toString(),
      categoryId: item.categoryId,
      imageUrl: item.imageUrl ?? "",
      isAvailable: item.isAvailable,
    });
    setShowItemForm(true);
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setError(null);

    const fd = new FormData();
    fd.append("file", file);
    const res = await fetch("/api/upload", { method: "POST", body: fd });
    const data = await res.json();
    setUploading(false);

    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    setItemForm((f) => ({ ...f, imageUrl: data.url }));
  };

  const saveItem = async () => {
    setError(null);
    const price = parseFloat(itemForm.price);
    if (!itemForm.name.trim()) { setError("Name is required"); return; }
    if (!itemForm.categoryId) { setError("Select a category"); return; }
    if (!Number.isFinite(price) || price < 0) { setError("Valid price required"); return; }

    setSaving(true);
    const payload = {
      name: itemForm.name.trim(),
      description: itemForm.description.trim(),
      price,
      categoryId: itemForm.categoryId,
      imageUrl: itemForm.imageUrl || null,
      isAvailable: itemForm.isAvailable,
    };

    const url = editingItem
      ? `/api/menu-items/${editingItem.id}`
      : "/api/menu-items";
    const method = editingItem ? "PATCH" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    setSaving(false);

    if (!res.ok) {
      const e = await res.json();
      setError(e.error ?? "Save failed");
      return;
    }
    resetItemForm();
    fetchData();
  };

  const deleteItem = async (id: string) => {
    if (!confirm("Delete this item?")) return;
    setError(null);
    const res = await fetch(`/api/menu-items/${id}`, { method: "DELETE" });
    if (!res.ok) {
      const e = await res.json();
      setError(e.error);
      return;
    }
    fetchData();
  };

  const toggleAvailability = async (item: MenuItem) => {
    await fetch(`/api/menu-items/${item.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isAvailable: !item.isAvailable }),
    });
    fetchData();
  };

  const catMap = new Map(categories.map((c) => [c.id, c.name]));

  return (
    <AdminGuard>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-xl font-semibold">Menu Management</h1>
          <div className="flex gap-2">
            <Link
              href="/admin/dashboard"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium"
            >
              Tables
            </Link>
            <Link
              href="/admin/feedback"
              className="rounded-lg border border-slate-300 px-3 py-2 text-sm font-medium"
            >
              Feedback
            </Link>
          </div>
        </div>

        {error && (
          <div className="rounded-xl bg-red-50 p-3 text-sm text-red-700 ring-1 ring-red-200">
            {error}
          </div>
        )}

        {loading ? (
          <p className="text-sm text-slate-500">Loading…</p>
        ) : (
          <>
            {/* ── Categories Section ── */}
            <section className="space-y-3">
              <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                Categories
              </h2>

              {categories.map((cat) => (
                <div
                  key={cat.id}
                  className="flex items-center gap-2 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100"
                >
                  {editingCat?.id === cat.id ? (
                    <>
                      <input
                        className="flex-1 rounded-lg border border-slate-300 px-2 py-1.5 text-sm"
                        value={editCatName}
                        onChange={(e) => setEditCatName(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && saveCategory()}
                      />
                      <button
                        onClick={saveCategory}
                        className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-brand/20"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingCat(null)}
                        className="text-xs text-slate-500"
                      >
                        Cancel
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="flex-1 text-sm font-medium">
                        {cat.name}
                      </span>
                      <span className="text-xs text-slate-400">
                        {items.filter((i) => i.categoryId === cat.id).length} items
                      </span>
                      <button
                        onClick={() => {
                          setEditingCat(cat);
                          setEditCatName(cat.name);
                        }}
                        className="text-xs text-blue-600"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => deleteCategory(cat.id)}
                        className="text-xs text-red-500"
                      >
                        Delete
                      </button>
                    </>
                  )}
                </div>
              ))}

              <div className="flex gap-2">
                <input
                  className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                  placeholder="New category name…"
                  value={catName}
                  onChange={(e) => setCatName(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && addCategory()}
                />
                <button
                  onClick={addCategory}
                  className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand/20"
                >
                  Add
                </button>
              </div>
            </section>

            {/* ── Items Section ── */}
            <section className="space-y-3">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-bold uppercase tracking-wide text-slate-500">
                  Menu Items
                </h2>
                <button
                  onClick={openNewItem}
                  className="rounded-lg bg-brand px-3 py-1.5 text-xs font-medium text-white shadow-sm shadow-brand/20"
                >
                  + Add Item
                </button>
              </div>

              {/* Item form (add/edit) */}
              {showItemForm && (
                <div className="space-y-3 rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-100">
                  <p className="text-sm font-semibold">
                    {editingItem ? "Edit Item" : "New Item"}
                  </p>

                  <input
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Item name"
                    value={itemForm.name}
                    onChange={(e) =>
                      setItemForm((f) => ({ ...f, name: e.target.value }))
                    }
                  />

                  <textarea
                    className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"
                    placeholder="Description"
                    rows={2}
                    value={itemForm.description}
                    onChange={(e) =>
                      setItemForm((f) => ({ ...f, description: e.target.value }))
                    }
                  />

                  <div className="flex gap-2">
                    <input
                      className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      placeholder="Price"
                      inputMode="decimal"
                      value={itemForm.price}
                      onChange={(e) =>
                        setItemForm((f) => ({ ...f, price: e.target.value }))
                      }
                    />
                    <select
                      className="flex-1 rounded-lg border border-slate-300 px-3 py-2 text-sm"
                      value={itemForm.categoryId}
                      onChange={(e) =>
                        setItemForm((f) => ({
                          ...f,
                          categoryId: e.target.value,
                        }))
                      }
                    >
                      <option value="">Select category</option>
                      {categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Image upload */}
                  <div className="space-y-2">
                    <label className="text-xs font-medium text-slate-600">
                      Image
                    </label>
                    {itemForm.imageUrl && (
                      <img
                        src={itemForm.imageUrl}
                        alt="Preview"
                        className="h-24 w-24 rounded-xl object-cover"
                      />
                    )}
                    <div className="flex items-center gap-2">
                      <input
                        ref={fileRef}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={handleUpload}
                      />
                      <button
                        type="button"
                        onClick={() => fileRef.current?.click()}
                        disabled={uploading}
                        className="rounded-lg border border-slate-300 px-3 py-1.5 text-xs font-medium disabled:opacity-50"
                      >
                        {uploading ? "Uploading…" : "Choose Image"}
                      </button>
                      {itemForm.imageUrl && (
                        <button
                          type="button"
                          onClick={() =>
                            setItemForm((f) => ({ ...f, imageUrl: "" }))
                          }
                          className="text-xs text-red-500"
                        >
                          Remove
                        </button>
                      )}
                    </div>
                  </div>

                  <label className="flex items-center gap-2 text-sm">
                    <input
                      type="checkbox"
                      checked={itemForm.isAvailable}
                      onChange={(e) =>
                        setItemForm((f) => ({
                          ...f,
                          isAvailable: e.target.checked,
                        }))
                      }
                      className="h-4 w-4 rounded border-slate-300"
                    />
                    Available
                  </label>

                  <div className="flex gap-2">
                    <button
                      onClick={saveItem}
                      disabled={saving}
                      className="rounded-lg bg-brand px-4 py-2 text-sm font-medium text-white shadow-sm shadow-brand/20 disabled:opacity-50"
                    >
                      {saving ? "Saving…" : editingItem ? "Update" : "Create"}
                    </button>
                    <button
                      onClick={resetItemForm}
                      className="rounded-lg border border-slate-300 px-4 py-2 text-sm"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Item list by category */}
              {categories.map((cat) => {
                const catItems = items.filter((i) => i.categoryId === cat.id);
                if (catItems.length === 0) return null;
                return (
                  <div key={cat.id} className="space-y-2">
                    <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                      {cat.name}
                    </p>
                    {catItems.map((item) => (
                      <div
                        key={item.id}
                        className={`flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100 ${
                          !item.isAvailable ? "opacity-50" : ""
                        }`}
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="h-12 w-12 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-100 text-slate-300">
                            <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">
                            {item.name}
                          </p>
                          <p className="text-xs text-slate-500">
                            {item.price.toFixed(2)} MAD · {catMap.get(item.categoryId)}
                            {!item.isAvailable && " · Unavailable"}
                          </p>
                        </div>
                        <div className="flex shrink-0 gap-1">
                          <button
                            onClick={() => toggleAvailability(item)}
                            className={`rounded-md px-2 py-1 text-[10px] font-medium ${
                              item.isAvailable
                                ? "bg-green-50 text-green-700"
                                : "bg-slate-100 text-slate-500"
                            }`}
                          >
                            {item.isAvailable ? "On" : "Off"}
                          </button>
                          <button
                            onClick={() => openEditItem(item)}
                            className="rounded-md px-2 py-1 text-[10px] font-medium text-blue-600"
                          >
                            Edit
                          </button>
                          <button
                            onClick={() => deleteItem(item.id)}
                            className="rounded-md px-2 py-1 text-[10px] font-medium text-red-500"
                          >
                            Del
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                );
              })}

              {/* Uncategorized items */}
              {items.filter((i) => !catMap.has(i.categoryId)).length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs font-bold uppercase tracking-wide text-slate-400">
                    Uncategorized
                  </p>
                  {items
                    .filter((i) => !catMap.has(i.categoryId))
                    .map((item) => (
                      <div
                        key={item.id}
                        className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm ring-1 ring-slate-100"
                      >
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-medium">{item.name}</p>
                          <p className="text-xs text-slate-500">
                            {item.price.toFixed(2)} MAD
                          </p>
                        </div>
                        <button
                          onClick={() => openEditItem(item)}
                          className="text-xs text-blue-600"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => deleteItem(item.id)}
                          className="text-xs text-red-500"
                        >
                          Del
                        </button>
                      </div>
                    ))}
                </div>
              )}
            </section>
          </>
        )}
      </div>
    </AdminGuard>
  );
}
