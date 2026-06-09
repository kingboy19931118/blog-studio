import type { Metadata } from 'next';

export const metadata: Metadata = { title: '关于' };

export default function AboutPage() {
  return (
    <div className="max-w-2xl mx-auto px-4 py-16">
      <h1 className="text-4xl font-bold text-gray-900 mb-6">关于这里</h1>
      <div className="prose prose-lg max-w-none prose-a:text-indigo-600">
        <p>
          这是一个独立的个人博客，用来记录我的所思所想。
          内容涵盖人文思考、技术探索、日常生活、随笔分享以及连载小说。
        </p>
        <p>
          我相信，写作是最好的思考方式。每一篇文章都是一次对话——
          与自己、与读者、与这个世界。
        </p>
        <h2>写作方向</h2>
        <ul>
          <li><strong>人文</strong> — 历史、哲学、文化与人性的思考</li>
          <li><strong>科技</strong> — 技术趋势、工程实践、工具方法论</li>
          <li><strong>生活</strong> — 日常记录、旅行、读书笔记</li>
          <li><strong>分享</strong> — 好物推荐、效率工具、学习资源</li>
          <li><strong>小说</strong> — 原创短篇与连载故事</li>
        </ul>
        <h2>联系我</h2>
        <p>
          如果你有想法想交流，欢迎通过邮件联系。
          我不一定能快速回复，但每封信都会认真阅读。
        </p>
      </div>
    </div>
  );
}
