import type { Metadata } from 'next';

export const metadata: Metadata = { title: { default: '后台管理', template: '%s | 后台' } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="min-h-screen bg-gray-50">{children}</div>;
}
