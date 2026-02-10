// ===== User =====
export interface User {
  id: string;
  email: string;
  username: string;
  name: string;
  bio: string;
  avatar_url: string;
  created_at: string;
  updated_at: string;
}

export interface UserProfile {
  id: string;
  username: string;
  name: string;
  bio: string;
  avatar_url: string;
  follower_count: number;
  following_count: number;
  created_at: string;
}

export interface UserSummary {
  id: string;
  username: string;
  name: string;
  avatar_url: string;
  bio: string;
}

// ===== Auth =====
export interface Tokens {
  access_token: string;
  refresh_token: string;
}

export interface AuthResponse {
  user: User;
  tokens: Tokens;
}

export interface SignupRequest {
  email: string;
  username: string;
  password: string;
  name?: string;
}

export interface SigninRequest {
  email: string;
  password: string;
}

// ===== Articles =====
export interface Author {
  username: string;
  name: string;
  avatar_url: string;
}

export interface Article {
  id: string;
  user_id: string;
  title: string;
  body: string;
  summary: string;
  thumbnail_url: string;
  status: "draft" | "published";
  published_at: string | null;
  created_at: string;
  updated_at: string;
  tags: string[];
  author?: Author;
  total_claps?: number;
  comment_count?: number;
}

export interface ArticleListResponse {
  articles: Article[];
  count: number;
}

export interface CreateArticleRequest {
  title: string;
  body: string;
  summary?: string;
  thumbnail_url?: string;
  status?: "draft" | "published";
  tags?: string[];
}

export interface UpdateArticleRequest {
  title?: string;
  body?: string;
  summary?: string;
  thumbnail_url?: string;
  tags?: string[];
}

// ===== Tags =====
export interface Tag {
  id: string;
  name: string;
  article_count: number;
}

// ===== Comments =====
export interface Comment {
  id: string;
  article_id: string;
  user_id: string;
  body: string;
  created_at: string;
  updated_at: string;
  author?: Author;
}

export interface CommentListResponse {
  comments: Comment[];
  count: number;
}

// ===== Claps =====
export interface ClapResponse {
  user_claps: number;
  total_claps: number;
}

// ===== Follows =====
export interface FollowListResponse {
  followers?: UserSummary[];
  following?: UserSummary[];
  count: number;
}

// ===== Pagination =====
export interface PaginationParams {
  limit?: number;
  offset?: number;
}
