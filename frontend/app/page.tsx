"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useAuth } from "@/lib/auth-context";
import { articles as articlesApi, tags as tagsApi } from "@/lib/api";
import type { Article, Tag } from "@/lib/types";
import { ArticleCard } from "@/components/article-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

export default function HomePage() {
  const { user } = useAuth();
  const [globalArticles, setGlobalArticles] = useState<Article[]>([]);
  const [feedArticles, setFeedArticles] = useState<Article[]>([]);
  const [popularTags, setPopularTags] = useState<Tag[]>([]);
  const [isLoadingGlobal, setIsLoadingGlobal] = useState(true);
  const [isLoadingFeed, setIsLoadingFeed] = useState(false);
  const [isLoadingTags, setIsLoadingTags] = useState(true);
  const [activeTab, setActiveTab] = useState("global");

  useEffect(() => {
    articlesApi
      .list({ limit: 20 })
      .then((res) => setGlobalArticles(res.articles || []))
      .catch(() => {})
      .finally(() => setIsLoadingGlobal(false));

    tagsApi
      .list()
      .then((res) => setPopularTags((res.tags || []).slice(0, 20)))
      .catch(() => {})
      .finally(() => setIsLoadingTags(false));
  }, []);

  useEffect(() => {
    if (user && activeTab === "feed") {
      setIsLoadingFeed(true);
      articlesApi
        .feed({ limit: 20 })
        .then((res) => setFeedArticles(res.articles || []))
        .catch(() => {})
        .finally(() => setIsLoadingFeed(false));
    }
  }, [user, activeTab]);

  function ArticleSkeletons() {
    return (
      <div className="space-y-6">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={i} className="space-y-3 py-4">
            <div className="flex items-center gap-2">
              <Skeleton className="h-5 w-5 rounded-full" />
              <Skeleton className="h-4 w-24" />
            </div>
            <Skeleton className="h-6 w-3/4" />
            <Skeleton className="h-4 w-full" />
            <div className="flex gap-2">
              <Skeleton className="h-4 w-16" />
              <Skeleton className="h-4 w-20" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-6xl px-4 py-8">
      <div className="flex gap-8">
        {/* Main content */}
        <div className="flex-1 min-w-0">
          <Tabs
            value={activeTab}
            onValueChange={setActiveTab}
            className="w-full"
          >
            <TabsList className="mb-6">
              {user && <TabsTrigger value="feed">Your Feed</TabsTrigger>}
              <TabsTrigger value="global">Global Feed</TabsTrigger>
            </TabsList>

            {user && (
              <TabsContent value="feed">
                {isLoadingFeed ? (
                  <ArticleSkeletons />
                ) : feedArticles.length > 0 ? (
                  <div className="divide-y">
                    {feedArticles.map((article) => (
                      <ArticleCard key={article.id} article={article} />
                    ))}
                  </div>
                ) : (
                  <div className="py-16 text-center">
                    <p className="text-muted-foreground">
                      No articles in your feed yet.
                    </p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      Follow some authors to see their articles here.
                    </p>
                  </div>
                )}
              </TabsContent>
            )}

            <TabsContent value="global">
              {isLoadingGlobal ? (
                <ArticleSkeletons />
              ) : globalArticles.length > 0 ? (
                <div className="divide-y">
                  {globalArticles.map((article) => (
                    <ArticleCard key={article.id} article={article} />
                  ))}
                </div>
              ) : (
                <div className="py-16 text-center">
                  <p className="text-muted-foreground">
                    No articles published yet.
                  </p>
                  {user && (
                    <Button asChild className="mt-4">
                      <Link href="/write">Write the first article</Link>
                    </Button>
                  )}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </div>

        {/* Sidebar */}
        <aside className="hidden w-64 flex-shrink-0 lg:block">
          <div className="sticky top-20">
            <h3 className="mb-4 text-sm font-semibold">
              Discover more of what matters to you
            </h3>

            {isLoadingTags ? (
              <div className="flex flex-wrap gap-2">
                {Array.from({ length: 8 }).map((_, i) => (
                  <Skeleton key={i} className="h-7 w-16 rounded-full" />
                ))}
              </div>
            ) : popularTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {popularTags.map((tag) => (
                  <Link key={tag.id} href={`/tag/${encodeURIComponent(tag.name)}`}>
                    <Badge
                      variant="secondary"
                      className="cursor-pointer hover:bg-secondary/80"
                    >
                      {tag.name}
                    </Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No tags yet.</p>
            )}

            <Separator className="my-6" />

            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
              <span>Help</span>
              <span>Status</span>
              <span>About</span>
              <span>Blog</span>
              <span>Privacy</span>
              <span>Terms</span>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
}
