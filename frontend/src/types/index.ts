export interface Category {
  id: number;
  name: string;
  slug: string;
  color: string;
  post_count: number;
  created_at: string;
  updated_at: string;
}

export type PostStatus = 'draft' | 'published';

export interface Post {
  id: number;
  title: string;
  slug: string;
  summary: string;
  content: string;
  cover_image: string;
  category_id: number | null;
  category: Category | null;
  status: PostStatus;
  view_count: number;
  created_at: string;
  updated_at: string;
}

export interface PostsResponse {
  posts: Post[];
  total: number;
  page: number;
  page_size: number;
  total_pages: number;
}

export interface Stats {
  total_posts: number;
  published: number;
  drafts: number;
  total_views: number;
  total_categories: number;
}
