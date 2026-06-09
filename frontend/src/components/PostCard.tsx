import Link from 'next/link';
import Image from 'next/image';
import { format } from 'date-fns';
import { Eye } from 'lucide-react';
import type { Post } from '@/types';
import CategoryBadge from './CategoryBadge';
import { getImageUrl } from '@/lib/api';

interface Props {
  post: Post;
  featured?: boolean;
}

export default function PostCard({ post, featured = false }: Props) {
  if (featured) {
    return (
      <Link href={`/blog/${post.slug}`} className="group block">
        <article className="grid md:grid-cols-2 gap-6 rounded-2xl overflow-hidden bg-gray-50 hover:bg-gray-100 transition-colors">
          {/* Cover */}
          <div className="relative aspect-[16/9] md:aspect-auto overflow-hidden bg-indigo-50">
            {post.cover_image ? (
              <Image
                src={getImageUrl(post.cover_image)}
                alt={post.title}
                fill
                className="object-cover group-hover:scale-105 transition-transform duration-500"
              />
            ) : (
              <div className="absolute inset-0 bg-gradient-to-br from-indigo-100 to-purple-100 flex items-center justify-center">
                <span className="text-4xl">✍️</span>
              </div>
            )}
          </div>
          {/* Content */}
          <div className="p-6 flex flex-col justify-center gap-3">
            <CategoryBadge category={post.category} size="sm" />
            <h2 className="text-2xl font-bold text-gray-900 group-hover:text-indigo-600 transition-colors leading-snug">
              {post.title}
            </h2>
            {post.summary && (
              <p className="text-gray-500 line-clamp-3 text-sm leading-relaxed">{post.summary}</p>
            )}
            <div className="flex items-center gap-3 text-xs text-gray-400 pt-1">
              <span>{format(new Date(post.created_at), 'yyyy年MM月dd日')}</span>
              <span className="flex items-center gap-1">
                <Eye className="w-3 h-3" /> {post.view_count}
              </span>
            </div>
          </div>
        </article>
      </Link>
    );
  }

  return (
    <Link href={`/blog/${post.slug}`} className="group block">
      <article className="rounded-xl overflow-hidden border border-gray-100 hover:border-indigo-200 hover:shadow-md transition-all duration-200 bg-white">
        {/* Cover */}
        <div className="relative aspect-[16/9] overflow-hidden bg-indigo-50">
          {post.cover_image ? (
            <Image
              src={getImageUrl(post.cover_image)}
              alt={post.title}
              fill
              className="object-cover group-hover:scale-105 transition-transform duration-500"
            />
          ) : (
            <div className="absolute inset-0 bg-gradient-to-br from-indigo-50 to-purple-50 flex items-center justify-center">
              <span className="text-3xl">✍️</span>
            </div>
          )}
        </div>
        {/* Content */}
        <div className="p-5 flex flex-col gap-2">
          <CategoryBadge category={post.category} />
          <h3 className="font-bold text-gray-900 group-hover:text-indigo-600 transition-colors leading-snug line-clamp-2">
            {post.title}
          </h3>
          {post.summary && (
            <p className="text-sm text-gray-500 line-clamp-2 leading-relaxed">{post.summary}</p>
          )}
          <div className="flex items-center gap-3 text-xs text-gray-400 pt-1">
            <span>{format(new Date(post.created_at), 'yyyy-MM-dd')}</span>
            <span className="flex items-center gap-1">
              <Eye className="w-3 h-3" /> {post.view_count}
            </span>
          </div>
        </div>
      </article>
    </Link>
  );
}
