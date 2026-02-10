import type {
  Article,
  ArticleListResponse,
  AuthResponse,
  ClapResponse,
  Comment,
  CommentListResponse,
  CreateArticleRequest,
  FollowListResponse,
  PaginationParams,
  SigninRequest,
  SignupRequest,
  Tag,
  UpdateArticleRequest,
  User,
  UserProfile,
} from "./types";

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

// ===== Token helpers =====
function getAccessToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("access_token");
}

function getRefreshToken(): string | null {
  if (typeof window === "undefined") return null;
  return localStorage.getItem("refresh_token");
}

function setTokens(access: string, refresh: string) {
  localStorage.setItem("access_token", access);
  localStorage.setItem("refresh_token", refresh);
}

function clearTokens() {
  localStorage.removeItem("access_token");
  localStorage.removeItem("refresh_token");
}

// ===== Core fetch wrapper =====
class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function refreshAccessToken(): Promise<string | null> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) return null;

  try {
    const res = await fetch(`${API_BASE}/api/auth/refresh`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ refresh_token: refreshToken }),
    });

    if (!res.ok) {
      clearTokens();
      return null;
    }

    const data = await res.json();
    localStorage.setItem("access_token", data.access_token);
    return data.access_token;
  } catch {
    clearTokens();
    return null;
  }
}

async function apiFetch<T>(
  path: string,
  options: RequestInit = {},
  retry = true,
): Promise<T> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    ...(options.headers as Record<string, string>),
  };

  const token = getAccessToken();
  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  const res = await fetch(`${API_BASE}${path}`, {
    ...options,
    headers,
  });

  // If 401, try refreshing the token once
  if (res.status === 401 && retry) {
    const newToken = await refreshAccessToken();
    if (newToken) {
      return apiFetch<T>(path, options, false);
    }
  }

  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: "Request failed" }));
    throw new ApiError(res.status, body.error || "Request failed");
  }

  // Handle empty responses (204, etc.)
  const text = await res.text();
  if (!text) return {} as T;
  return JSON.parse(text);
}

function buildQuery(params: Record<string, string | number | undefined>): string {
  const entries = Object.entries(params).filter(
    ([, v]) => v !== undefined && v !== "",
  );
  if (entries.length === 0) return "";
  return "?" + new URLSearchParams(entries.map(([k, v]) => [k, String(v)])).toString();
}

// ===== Auth API =====
export const auth = {
  async signup(data: SignupRequest): Promise<AuthResponse> {
    const res = await apiFetch<AuthResponse>("/api/auth/signup", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setTokens(res.tokens.access_token, res.tokens.refresh_token);
    return res;
  },

  async signin(data: SigninRequest): Promise<AuthResponse> {
    const res = await apiFetch<AuthResponse>("/api/auth/signin", {
      method: "POST",
      body: JSON.stringify(data),
    });
    setTokens(res.tokens.access_token, res.tokens.refresh_token);
    return res;
  },

  async logout(): Promise<void> {
    const refreshToken = getRefreshToken();
    if (refreshToken) {
      await apiFetch("/api/auth/logout", {
        method: "POST",
        body: JSON.stringify({ refresh_token: refreshToken }),
      }).catch(() => {});
    }
    clearTokens();
  },
};

// ===== Users API =====
export const users = {
  async getProfile(username: string): Promise<UserProfile> {
    return apiFetch<UserProfile>(`/api/users/${encodeURIComponent(username)}`);
  },

  async updateProfile(data: {
    name?: string;
    bio?: string;
    avatar_url?: string;
  }): Promise<User> {
    return apiFetch<User>("/api/users", {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },
};

// ===== Articles API =====
export const articles = {
  async create(data: CreateArticleRequest): Promise<Article> {
    return apiFetch<Article>("/api/articles", {
      method: "POST",
      body: JSON.stringify(data),
    });
  },

  async list(
    params?: PaginationParams & { author?: string },
  ): Promise<ArticleListResponse> {
    const query = buildQuery({
      limit: params?.limit,
      offset: params?.offset,
      author: params?.author,
    });
    return apiFetch<ArticleListResponse>(`/api/articles${query}`);
  },

  async feed(params?: PaginationParams): Promise<ArticleListResponse> {
    const query = buildQuery({
      limit: params?.limit,
      offset: params?.offset,
    });
    return apiFetch<ArticleListResponse>(`/api/articles/feed${query}`);
  },

  async search(
    q: string,
    params?: PaginationParams,
  ): Promise<ArticleListResponse> {
    const query = buildQuery({
      q,
      limit: params?.limit,
      offset: params?.offset,
    });
    return apiFetch<ArticleListResponse>(`/api/articles/search${query}`);
  },

  async drafts(params?: PaginationParams): Promise<ArticleListResponse> {
    const query = buildQuery({
      limit: params?.limit,
      offset: params?.offset,
    });
    return apiFetch<ArticleListResponse>(`/api/articles/drafts${query}`);
  },

  async get(id: string): Promise<Article> {
    return apiFetch<Article>(`/api/articles/${id}`);
  },

  async update(id: string, data: UpdateArticleRequest): Promise<Article> {
    return apiFetch<Article>(`/api/articles/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    });
  },

  async delete(id: string): Promise<void> {
    await apiFetch(`/api/articles/${id}`, { method: "DELETE" });
  },

  async publish(id: string): Promise<Article> {
    return apiFetch<Article>(`/api/articles/${id}/publish`, {
      method: "POST",
    });
  },
};

// ===== Tags API =====
export const tags = {
  async list(): Promise<{ tags: Tag[] }> {
    return apiFetch<{ tags: Tag[] }>("/api/tags");
  },

  async getArticles(
    name: string,
    params?: PaginationParams,
  ): Promise<ArticleListResponse> {
    const query = buildQuery({
      limit: params?.limit,
      offset: params?.offset,
    });
    return apiFetch<ArticleListResponse>(
      `/api/tags/${encodeURIComponent(name)}/articles${query}`,
    );
  },
};

// ===== Comments API =====
export const comments = {
  async create(articleId: string, body: string): Promise<Comment> {
    return apiFetch<Comment>(`/api/articles/${articleId}/comments`, {
      method: "POST",
      body: JSON.stringify({ body }),
    });
  },

  async list(
    articleId: string,
    params?: PaginationParams,
  ): Promise<CommentListResponse> {
    const query = buildQuery({
      limit: params?.limit,
      offset: params?.offset,
    });
    return apiFetch<CommentListResponse>(
      `/api/articles/${articleId}/comments${query}`,
    );
  },

  async delete(id: string): Promise<void> {
    await apiFetch(`/api/comments/${id}`, { method: "DELETE" });
  },
};

// ===== Claps API =====
export const claps = {
  async clap(
    articleId: string,
    count: number = 1,
  ): Promise<ClapResponse> {
    return apiFetch<ClapResponse>(`/api/articles/${articleId}/clap`, {
      method: "POST",
      body: JSON.stringify({ count }),
    });
  },

  async get(articleId: string): Promise<ClapResponse> {
    return apiFetch<ClapResponse>(`/api/articles/${articleId}/claps`);
  },
};

// ===== Follows API =====
export const follows = {
  async follow(username: string): Promise<void> {
    await apiFetch(`/api/users/${encodeURIComponent(username)}/follow`, {
      method: "POST",
    });
  },

  async unfollow(username: string): Promise<void> {
    await apiFetch(`/api/users/${encodeURIComponent(username)}/follow`, {
      method: "DELETE",
    });
  },

  async followers(
    username: string,
    params?: PaginationParams,
  ): Promise<FollowListResponse> {
    const query = buildQuery({
      limit: params?.limit,
      offset: params?.offset,
    });
    return apiFetch<FollowListResponse>(
      `/api/users/${encodeURIComponent(username)}/followers${query}`,
    );
  },

  async following(
    username: string,
    params?: PaginationParams,
  ): Promise<FollowListResponse> {
    const query = buildQuery({
      limit: params?.limit,
      offset: params?.offset,
    });
    return apiFetch<FollowListResponse>(
      `/api/users/${encodeURIComponent(username)}/following${query}`,
    );
  },
};

export { ApiError, clearTokens, getAccessToken, getRefreshToken };
