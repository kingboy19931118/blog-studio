import Link from 'next/link';
import type { Category } from '@/types';

interface Props {
  category: Category | null;
  linkable?: boolean;
  size?: 'sm' | 'md';
}

export default function CategoryBadge({ category, linkable = true, size = 'sm' }: Props) {
  if (!category) return null;

  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';
  const badge = (
    <span
      className={`inline-block rounded-full font-medium ${sizeClass}`}
      style={{
        backgroundColor: category.color + '20',
        color: category.color,
        border: `1px solid ${category.color}40`,
      }}
    >
      {category.name}
    </span>
  );

  if (!linkable) return badge;
  return <Link href={`/blog?category=${category.slug}`}>{badge}</Link>;
}
