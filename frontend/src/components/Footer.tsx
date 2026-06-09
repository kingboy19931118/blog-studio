import Link from 'next/link';
import { PenSquare } from 'lucide-react';

export default function Footer() {
  return (
    <footer className="mt-auto border-t border-gray-100 bg-gray-50">
      <div className="max-w-5xl mx-auto px-4 py-10 flex flex-col md:flex-row items-center justify-between gap-4 text-sm text-gray-500">
        <div className="flex items-center gap-2 font-semibold text-gray-700">
          <PenSquare className="w-4 h-4 text-indigo-600" />
          Blog Studio
        </div>
        <p>用文字记录思考，用代码构建世界。</p>
        <div className="flex items-center gap-4">
          <Link href="/blog" className="hover:text-gray-900 transition-colors">文章</Link>
          <Link href="/about" className="hover:text-gray-900 transition-colors">关于</Link>
          <Link href="/admin" className="hover:text-gray-900 transition-colors">后台</Link>
        </div>
      </div>
    </footer>
  );
}
