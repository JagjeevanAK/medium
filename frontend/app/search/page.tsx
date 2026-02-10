"use client";

import { Suspense, useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { articles as articlesApi } from "@/lib/api";
import type { Article } from "@/lib/types";
import { ArticleCard } from "@/components/article-card";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Search } from "lucide-react";

function SearchContent() {
  const searchParams = useSearchParams();
  const initialQuery = searchParams.get("q") || "";
  const [query, setQuery] = useState(initialQuery);
  const [results, setResults] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);

  useEffect(() => {
    if (initialQuery) {
      performSearch(initialQuery);
    }
  }, [initialQuery]);

  async function performSearch(q: string) {
    if (!q.trim()) return;
    setIsLoading(true);
    setHasSearched(true);
    try {
      const res = await articlesApi.search(q.trim(), { limit: 20 });
      setResults(res.articles || []);
    } catch {
      setResults([]);
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (query.trim()) {
      window.history.replaceState(
        null,
        "",
        `/search?q=${encodeURIComponent(query.trim())}`,
      );
      performSearch(query.trim());
    }
  }

  return (
    <>
      <form onSubmit={handleSubmit} className="mb-8">
        <div className="relative">
          <Search className="absolute left-3 top-3 h-5 w-5 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search articles..."
            className="h-11 pl-10 text-base"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
          />
        </div>
      </form>

      {isLoading ? (
        <div className="space-y-6">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="space-y-3 py-4">
              <Skeleton className="h-6 w-3/4" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-16" />
            </div>
          ))}
        </div>
      ) : hasSearched ? (
        results.length > 0 ? (
          <>
            <p className="mb-4 text-sm text-muted-foreground">
              {results.length} result{results.length !== 1 ? "s" : ""} found
            </p>
            <div className="divide-y">
              {results.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          </>
        ) : (
          <p className="py-8 text-center text-muted-foreground">
            No articles found for &ldquo;{initialQuery || query}&rdquo;
          </p>
        )
      ) : (
        <p className="py-8 text-center text-muted-foreground">
          Enter a search term to find articles.
        </p>
      )}
    </>
  );
}

export default function SearchPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <h1 className="mb-6 text-2xl font-bold">Search</h1>
      <Suspense
        fallback={
          <div className="space-y-6">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="space-y-3 py-4">
                <Skeleton className="h-6 w-3/4" />
                <Skeleton className="h-4 w-full" />
                <Skeleton className="h-4 w-16" />
              </div>
            ))}
          </div>
        }
      >
        <SearchContent />
      </Suspense>
    </div>
  );
}
