import Image from 'next/image';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { format } from 'date-fns';
import { Eye, ArrowLeft, Clock } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import rehypeHighlight from 'rehype-highlight';
import rehypeRaw from 'rehype-raw';
import type { Metadata } from 'next';
import type { Post } from '@/types';
import CategoryBadge from '@/components/CategoryBadge';
import { getImageUrl } from '@/lib/api';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8080';

async function getPost(slug: string): Promise<Post | null> {
  try {
    const res = await fetch(`${API}/api/posts/${slug}`, { cache: 'no-store' });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const post = await getPost(params.slug);
  if (!post) return { title: '文章未找到' };
  return {
    title: post.title,
    description: post.summary,
    openGraph: {
      title: post.title,
      description: post.summary,
      images: post.cover_image ? [getImageUrl(post.cover_image)] : [],
    },
  };
}

function estimateReadTime(content: string) {
  const words = content.split(/\s+/).length;
  return Math.max(1, Math.round(words / 300));
}

export default async function PostPage({ params }: { params: { slug: string } }) {
  const post = await getPost(params.slug);
  if (!post) notFound();

  const readTime = estimateReadTime(post.content || '');

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      {/* Back */}
      <Link
        href="/blog"
        className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-indigo-600 mb-8 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" /> 返回文章列表
      </Link>

      {/* Category */}
      {post.category && (
        <div className="mb-4">
          <CategoryBadge category={post.category} size="md" />
        </div>
      )}

      {/* Title */}
      <h1 className="text-4xl font-bold text-gray-900 leading-tight mb-4">
        {post.title}
      </h1>

      {/* Meta */}
      <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400 mb-8">
        <span>{format(new Date(post.created_at), 'yyyy年MM月dd日')}</span>
        <span className="flex items-center gap-1">
          <Eye className="w-3.5 h-3.5" /> {post.view_count} 次阅读
        </span>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> 约 {readTime} 分钟
        </span>
      </div>

      {/* Cover image */}
      {post.cover_image && (
        <div className="relative aspect-[16/9] rounded-2xl overflow-hidden mb-10 bg-gray-100">
          <Image
            src={getImageUrl(post.cover_image)}
            alt={post.title}
            fill
            className="object-cover"
            priority
          />
        </div>
      )}

      {/* Summary */}
      {post.summary && (
        <p className="text-lg text-gray-500 leading-relaxed border-l-4 border-indigo-300 pl-4 mb-10 italic">
          {post.summary}
        </p>
      )}

      {/* Content */}
      <div className="prose prose-lg max-w-none
        prose-headings:font-bold prose-headings:text-gray-900
        prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline
        prose-code:bg-gray-100 prose-code:rounded prose-code:px-1 prose-code:text-sm prose-code:font-normal
        prose-pre:bg-gray-900 prose-pre:rounded-xl
        prose-blockquote:border-indigo-300 prose-blockquote:text-gray-500
        prose-img:rounded-xl prose-img:shadow-md">
        <ReactMarkdown
          remarkPlugins={[remarkGfm]}
          rehypePlugins={[rehypeHighlight, rehypeRaw]}
        >
          {post.content || ''}
        </ReactMarkdown>
      </div>

      {/* Footer */}
      <div className="mt-16 pt-8 border-t border-gray-100 flex items-center justify-between">
        <Link href="/blog" className="inline-flex items-center gap-2 text-indigo-600 hover:underline text-sm">
          <ArrowLeft className="w-4 h-4" /> 返回列表
        </Link>
        <span className="text-xs text-gray-400">
          最后更新：{format(new Date(post.updated_at), 'yyyy-MM-dd')}
        </span>
      </div>
    </article>
  );
}
