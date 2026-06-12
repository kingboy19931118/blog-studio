'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X, PenSquare } from 'lucide-react';
import { getCategories } from '@/lib/api';
import type { Category } from '@/types';

const primaryLinks = [
  { href: '/', label: '首页' },
  { href: '/blog', label: '全部文章' },
];

interface NavLink {
  href: string;
  label: string;
  category?: string;
}

export default function Navbar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [categories, setCategories] = useState<Category[]>([]);
  const [activeCategory, setActiveCategory] = useState('');

  useEffect(() => {
    getCategories().then(setCategories).catch(() => setCategories([]));

    const syncCategory = () => {
      setActiveCategory(new URLSearchParams(window.location.search).get('category') || '');
    };
    syncCategory();
    window.addEventListener('popstate', syncCategory);
    return () => window.removeEventListener('popstate', syncCategory);
  }, []);

  const navLinks: NavLink[] = [
    ...primaryLinks,
    ...categories.map((category) => ({
      href: `/blog?category=${encodeURIComponent(category.slug)}`,
      label: category.name,
      category: category.slug,
    })),
    { href: '/about', label: '关于' },
  ];

  const isActive = (link: NavLink) => {
    if (link.category) {
      return pathname === '/blog' && activeCategory === link.category;
    }
    if (link.href === '/blog') {
      return pathname === '/blog' && !activeCategory;
    }
    return pathname === link.href;
  };

  return (
    <header className="sticky top-0 z-40 bg-white/80 backdrop-blur border-b border-gray-100">
      <nav className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2 font-bold text-xl text-gray-900">
          <PenSquare className="w-5 h-5 text-indigo-600" />
          Blog Studio
        </Link>

        <ul className="hidden md:flex items-center gap-1">
          {navLinks.map((link) => (
            <li key={link.href}>
              <Link
                href={link.href}
                onClick={() => setActiveCategory(link.category || '')}
                className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                  isActive(link)
                    ? 'text-indigo-600 bg-indigo-50'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>

        <button
          className="md:hidden p-2 rounded-md text-gray-600 hover:bg-gray-100"
          onClick={() => setOpen((current) => !current)}
          aria-label="菜单"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </nav>

      {open && (
        <div className="md:hidden border-t border-gray-100 bg-white px-4 pb-4">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => {
                setActiveCategory(link.category || '');
                setOpen(false);
              }}
              className={`block py-2.5 text-sm font-medium ${
                isActive(link) ? 'text-indigo-600' : 'text-gray-700 hover:text-indigo-600'
              }`}
            >
              {link.label}
            </Link>
          ))}
        </div>
      )}
    </header>
  );
}
