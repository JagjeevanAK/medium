"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { tags as tagsApi } from "@/lib/api";
import type { Article } from "@/lib/types";
import { ArticleCard } from "@/components/article-card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

export default function TagPage() {
  const params = useParams();
  const tagName = decodeURIComponent(params.name as string);
  const [tagArticles, setTagArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!tagName) return;
    setIsLoading(true);
    tagsApi
      .getArticles(tagName, { limit: 20 })
      .then((res) => setTagArticles(res.articles || []))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, [tagName]);

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-8">
        <Badge variant="secondary" className="mb-2 text-base px-3 py-1">
          {tagName}
        </Badge>
        <h1 className="text-2xl font-bold">
          Articles tagged &ldquo;{tagName}&rdquo;
        </h1>
      </div>

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
      ) : tagArticles.length > 0 ? (
        <div className="divide-y">
          {tagArticles.map((article) => (
            <ArticleCard key={article.id} article={article} />
          ))}
        </div>
      ) : (
        <p className="py-8 text-center text-muted-foreground">
          No articles found with this tag.
        </p>
      )}
    </div>
  );
}
