import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import PostCard from '@/components/PostCard';
import CategoryBadge from '@/components/CategoryBadge';
import type { Post, Category } from '@/types';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function getFeaturedPosts(): Promise<Post[]> {
  try {
    const res = await fetch(`${API}/api/posts?page=1&page_size=5&status=published`, {
      next: { revalidate: 60 },
    });
    if (!res.ok) return [];
    const data = await res.json();
    return data.posts || [];
  } catch {
    return [];
  }
}

async function getCategories(): Promise<Category[]> {
  try {
    const res = await fetch(`${API}/api/categories`, { next: { revalidate: 60 } });
    if (!res.ok) return [];
    return res.json();
  } catch {
    return [];
  }
}

export default async function HomePage() {
  const [posts, categories] = await Promise.all([getFeaturedPosts(), getCategories()]);
  const [featured, ...rest] = posts;

  return (
    <div className="max-w-5xl mx-auto px-4 py-12 flex flex-col gap-16">

      {/* Hero */}
      <section className="text-center flex flex-col gap-4 py-8">
        <h1 className="text-5xl font-bold tracking-tight text-gray-900">
          用文字<span className="text-indigo-600">记录</span>，用思考<span className="text-indigo-600">探索</span>
        </h1>
        <p className="text-lg text-gray-500 max-w-xl mx-auto">
          人文 · 科技 · 生活 · 分享 · 小说 — 一个独立思考者的内容空间
        </p>
        <div className="flex items-center justify-center gap-3 pt-2">
          <Link
            href="/blog"
            className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-full font-medium hover:bg-indigo-700 transition-colors"
          >
            开始阅读 <ArrowRight className="w-4 h-4" />
          </Link>
        </div>
      </section>

      {/* Categories */}
      {categories.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-gray-700">浏览分类</h2>
          <div className="flex flex-wrap gap-2">
            {categories.map((cat) => (
              <Link
                key={cat.id}
                href={`/blog?category=${cat.slug}`}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-full border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-colors text-sm font-medium text-gray-700"
              >
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: cat.color }}
                />
                {cat.name}
                <span className="text-gray-400 text-xs">{cat.post_count}</span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Featured post */}
      {featured && (
        <section className="flex flex-col gap-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-700">最新文章</h2>
            <Link href="/blog" className="text-sm text-indigo-600 hover:underline flex items-center gap-1">
              查看全部 <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          <PostCard post={featured} featured />
        </section>
      )}

      {/* Recent posts grid */}
      {rest.length > 0 && (
        <section className="flex flex-col gap-4">
          <h2 className="text-lg font-semibold text-gray-700">更多文章</h2>
          <div className="grid sm:grid-cols-2 lg:grid-cols-2 gap-6">
            {rest.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
          <div className="text-center pt-4">
            <Link
              href="/blog"
              className="inline-flex items-center gap-2 text-indigo-600 hover:underline font-medium"
            >
              浏览所有文章 <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </section>
      )}

      {/* Empty state */}
      {posts.length === 0 && (
        <div className="text-center py-24 text-gray-400">
          <p className="text-lg">还没有文章，去后台写第一篇吧 ✍️</p>
          <Link href="/admin" className="mt-4 inline-block text-indigo-600 hover:underline">
            进入后台
          </Link>
        </div>
      )}
    </div>
  );
}
