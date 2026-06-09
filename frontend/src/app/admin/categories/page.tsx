'use client';

import { useEffect, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2 } from 'lucide-react';
import Sidebar from '@/components/admin/Sidebar';
import AuthGuard from '@/components/admin/AuthGuard';
import { getCategories, createCategory, updateCategory, deleteCategory } from '@/lib/api';
import type { Category } from '@/types';

const COLORS = [
  '#6366f1', '#8b5cf6', '#ec4899', '#f59e0b',
  '#10b981', '#3b82f6', '#ef4444', '#14b8a6',
];

interface FormState { name: string; color: string; }

export default function AdminCategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState<FormState>({ name: '', color: COLORS[0] });
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const fetchCategories = async () => {
    setLoading(true);
    try {
      setCategories(await getCategories());
    } finally { setLoading(false); }
  };

  useEffect(() => { fetchCategories(); }, []);

  const startEdit = (cat: Category) => {
    setEditId(cat.id);
    setForm({ name: cat.name, color: cat.color });
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm({ name: '', color: COLORS[0] });
    setError('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) { setError('名称不能为空'); return; }
    setSaving(true); setError('');
    try {
      if (editId) {
        await updateCategory(editId, form);
      } else {
        await createCategory(form);
      }
      cancelEdit();
      fetchCategories();
    } catch {
      setError('操作失败，名称可能已存在');
    } finally { setSaving(false); }
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`确定删除「${name}」分类？`)) return;
    await deleteCategory(id);
    fetchCategories();
  };

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-2xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">分类管理</h1>

            {/* Form */}
            <div className="bg-white rounded-xl border border-gray-100 p-6 mb-6">
              <h2 className="font-semibold text-gray-900 mb-4">
                {editId ? '编辑分类' : '新建分类'}
              </h2>
              <form onSubmit={handleSubmit} className="flex flex-col gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">名称</label>
                  <input
                    type="text"
                    value={form.name}
                    onChange={(e) => setForm({ ...form, name: e.target.value })}
                    placeholder="如：科技、人文、生活..."
                    className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">颜色</label>
                  <div className="flex gap-2 flex-wrap">
                    {COLORS.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setForm({ ...form, color: c })}
                        className={`w-8 h-8 rounded-full transition-transform ${form.color === c ? 'scale-125 ring-2 ring-offset-2 ring-gray-400' : ''}`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
                {error && <p className="text-sm text-red-500">{error}</p>}
                <div className="flex gap-2">
                  <button type="submit" disabled={saving}
                    className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors">
                    {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
                    {editId ? '保存' : '创建'}
                  </button>
                  {editId && (
                    <button type="button" onClick={cancelEdit}
                      className="px-4 py-2 border border-gray-200 rounded-lg text-sm font-medium text-gray-600 hover:bg-gray-50 transition-colors">
                      取消
                    </button>
                  )}
                </div>
              </form>
            </div>

            {/* List */}
            <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="w-5 h-5 animate-spin text-indigo-500" />
                </div>
              ) : categories.length === 0 ? (
                <div className="text-center py-12 text-gray-400">还没有分类，创建一个吧</div>
              ) : (
                <ul className="divide-y divide-gray-50">
                  {categories.map((cat) => (
                    <li key={cat.id} className="flex items-center justify-between px-5 py-3.5">
                      <div className="flex items-center gap-3">
                        <span className="w-3 h-3 rounded-full" style={{ backgroundColor: cat.color }} />
                        <span className="font-medium text-gray-900 text-sm">{cat.name}</span>
                        <span className="text-xs text-gray-400">{cat.post_count} 篇</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <button onClick={() => startEdit(cat)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 transition-colors">
                          <Pencil className="w-4 h-4" />
                        </button>
                        <button onClick={() => handleDelete(cat.id, cat.name)}
                          className="p-1.5 rounded-md text-gray-400 hover:text-red-600 hover:bg-red-50 transition-colors">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
