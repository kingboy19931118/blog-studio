'use client';

import { useEffect, useState } from 'react';
import { FileText, Eye, Tag, TrendingUp } from 'lucide-react';
import Sidebar from '@/components/admin/Sidebar';
import AuthGuard from '@/components/admin/AuthGuard';
import { getStats } from '@/lib/api';
import type { Stats } from '@/types';

function StatCard({ label, value, icon: Icon, color }: {
  label: string; value: number; icon: React.ElementType; color: string;
}) {
  return (
    <div className="bg-white rounded-xl p-6 border border-gray-100 flex items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center ${color}`}>
        <Icon className="w-6 h-6" />
      </div>
      <div>
        <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
        <p className="text-sm text-gray-500">{label}</p>
      </div>
    </div>
  );
}

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);

  useEffect(() => {
    getStats().then(setStats).catch(console.error);
  }, []);

  return (
    <AuthGuard>
      <div className="flex h-screen overflow-hidden">
        <Sidebar />
        <main className="flex-1 overflow-y-auto p-8">
          <div className="max-w-4xl">
            <h1 className="text-2xl font-bold text-gray-900 mb-8">仪表盘</h1>
            {stats && (
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                <StatCard
                  label="全部文章" value={stats.total_posts}
                  icon={FileText} color="bg-indigo-50 text-indigo-600"
                />
                <StatCard
                  label="已发布" value={stats.published}
                  icon={TrendingUp} color="bg-green-50 text-green-600"
                />
                <StatCard
                  label="草稿" value={stats.drafts}
                  icon={FileText} color="bg-yellow-50 text-yellow-600"
                />
                <StatCard
                  label="总阅读量" value={stats.total_views}
                  icon={Eye} color="bg-blue-50 text-blue-600"
                />
              </div>
            )}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="bg-white rounded-xl p-6 border border-gray-100">
                <div className="flex items-center gap-2 mb-4">
                  <Tag className="w-4 h-4 text-gray-500" />
                  <h2 className="font-semibold text-gray-900">分类数量</h2>
                </div>
                <p className="text-3xl font-bold text-gray-900">{stats?.total_categories ?? '—'}</p>
              </div>
              <div className="bg-white rounded-xl p-6 border border-gray-100 flex flex-col gap-3">
                <h2 className="font-semibold text-gray-900">快捷操作</h2>
                <div className="flex flex-col gap-2">
                  <a
                    href="/admin/posts/new"
                    className="inline-flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors w-fit"
                  >
                    ✍️ 写新文章
                  </a>
                  <a
                    href="/admin/categories"
                    className="inline-flex items-center gap-2 border border-gray-200 text-gray-700 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-50 transition-colors w-fit"
                  >
                    🏷️ 管理分类
                  </a>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </AuthGuard>
  );
}
