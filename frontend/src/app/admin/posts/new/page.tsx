'use client';

import dynamic from 'next/dynamic';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Upload, Loader2 } from 'lucide-react';
import Link from 'next/link';
import Sidebar from '@/components/admin/Sidebar';
import AuthGuard from '@/components/admin/AuthGuard';
import { createPost, getCategories, uploadFile, getImageUrl } from '@/lib/api';
import type { Category } from '@/types';

const MDEditor = dynamic(() => import('@uiw/react-md-editor'), { ssr: false });

export default function NewPostPage() {
  const router = useRouter();
  const [title, setTitle] = useState('');
  const [summary, setSummary] = useState('');
  const [content, setContent] = useState('');
  const [coverImage, setCoverImage] = useState('');
  const [categoryId, setCategoryId] = useState<number | ''>('');
  const [status, setStatus] = useState<'draft' | 'published'>('draft');
  const [categories, setCategories] = useState<Category[]>([]);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => { getCategories().then(setCategories); }, []);

  const handleCoverUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const data = await uploadFile(file);
      setCoverImage(data.url);
    } catch {
      setError('图片上传失败');
    } finally {
      setUploading(false);
    }
  };

  const handleSave = async (saveStatus: 'draft' | 'published') => {
    if (!title.trim()) { setError('标题不能为空'); return; }
    setSaving(true);
    setError('');
    try {
      await createPost({
        title,
        summary,
        content,
        cover_image: coverImage,
        category_id: categoryId || null,
        status: saveStatus,
      });
      router.push('/admin/posts');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : '保存失败';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto bg-gray-50">
          {/* Topbar */}
          <div className="sticky top-0 z-10 bg-white border-b border-gray-100 px-6 h-14 flex items-center justify-between">
            <Link href="/admin/posts" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900">
              <ArrowLeft className="w-4 h-4" /> 文章列表
            </Link>
            <div className="flex items-center gap-2">
              {error && <span className="text-sm text-red-500">{error}</span>}
              <button
                onClick={() => handleSave('draft')}
                disabled={saving}
                className="px-4 py-1.5 border border-gray-200 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-60 transition-colors"
              >
                保存草稿
              </button>
              <button
                onClick={() => handleSave('published')}
                disabled={saving}
                className="flex items-center gap-2 px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 disabled:opacity-60 transition-colors"
              >
                {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                发布
              </button>
            </div>
          </div>

          <div className="max-w-4xl mx-auto px-6 py-8 flex flex-col gap-6">
            {/* Title */}
            <input
              type="text"
              placeholder="文章标题..."
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="text-3xl font-bold bg-transparent border-none outline-none placeholder-gray-300 text-gray-900 w-full"
            />

            {/* Meta row */}
            <div className="flex flex-wrap gap-4 pb-4 border-b border-gray-100">
              <select
                value={categoryId}
                onChange={(e) => setCategoryId(e.target.value ? Number(e.target.value) : '')}
                className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
              >
                <option value="">无分类</option>
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            {/* Summary */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-1">摘要</label>
              <textarea
                placeholder="文章摘要（可选）"
                value={summary}
                onChange={(e) => setSummary(e.target.value)}
                rows={2}
                className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              />
            </div>

            {/* Cover image */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">封面图</label>
              {coverImage ? (
                <div className="relative group w-full max-w-md">
                  <img src={getImageUrl(coverImage)} alt="cover" className="rounded-xl w-full object-cover max-h-48" />
                  <button
                    onClick={() => setCoverImage('')}
                    className="absolute top-2 right-2 bg-black/50 text-white px-2 py-1 rounded text-xs opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    移除
                  </button>
                </div>
              ) : (
                <label className="flex items-center gap-2 px-4 py-3 border-2 border-dashed border-gray-200 rounded-xl text-sm text-gray-500 hover:border-indigo-300 cursor-pointer w-fit transition-colors">
                  {uploading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
                  {uploading ? '上传中...' : '上传封面图'}
                  <input type="file" accept="image/*" className="hidden" onChange={handleCoverUpload} />
                </label>
              )}
            </div>

            {/* Markdown editor */}
            <div>
              <label className="block text-sm font-medium text-gray-600 mb-2">正文（Markdown）</label>
              <div data-color-mode="light">
                <MDEditor
                  value={content}
                  onChange={(v) => setContent(v || '')}
                  height={500}
                  preview="live"
                />
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
