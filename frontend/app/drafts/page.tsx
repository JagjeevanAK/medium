"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { articles as articlesApi, ApiError } from "@/lib/api";
import type { Article } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { PenSquare, Trash2 } from "lucide-react";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function DraftsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const [drafts, setDrafts] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/signin");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (user) {
      articlesApi
        .drafts({ limit: 50 })
        .then((res) => setDrafts(res.articles || []))
        .catch(() => {})
        .finally(() => setIsLoading(false));
    }
  }, [user]);

  async function handleDelete(id: string) {
    try {
      await articlesApi.delete(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      toast.success("Draft deleted");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    }
  }

  async function handlePublish(id: string) {
    try {
      await articlesApi.publish(id);
      setDrafts((prev) => prev.filter((d) => d.id !== id));
      toast.success("Article published!");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <p className="text-muted-foreground">Loading...</p>
      </div>
    );
  }

  if (!user) return null;

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Your Drafts</h1>
        <Button asChild>
          <Link href="/write">
            <PenSquare className="mr-1.5 h-4 w-4" />
            New story
          </Link>
        </Button>
      </div>

      {isLoading ? (
        <div className="space-y-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div key={i} className="rounded-lg border p-4">
              <Skeleton className="h-6 w-2/3" />
              <Skeleton className="mt-2 h-4 w-full" />
              <Skeleton className="mt-2 h-4 w-24" />
            </div>
          ))}
        </div>
      ) : drafts.length > 0 ? (
        <div className="space-y-4">
          {drafts.map((draft) => (
            <div
              key={draft.id}
              className="flex items-start justify-between rounded-lg border p-4"
            >
              <div className="flex-1 min-w-0">
                <Link
                  href={`/write/${draft.id}`}
                  className="text-lg font-semibold hover:underline"
                >
                  {draft.title || "Untitled"}
                </Link>
                {draft.summary && (
                  <p className="mt-1 text-sm text-muted-foreground line-clamp-2">
                    {draft.summary}
                  </p>
                )}
                <p className="mt-2 text-xs text-muted-foreground">
                  Last edited {formatDate(draft.updated_at)}
                </p>
              </div>
              <div className="ml-4 flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handlePublish(draft.id)}
                >
                  Publish
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-8 w-8"
                  onClick={() => handleDelete(draft.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="py-16 text-center">
          <p className="text-muted-foreground">You have no drafts yet.</p>
          <Button asChild className="mt-4">
            <Link href="/write">Write your first story</Link>
          </Button>
        </div>
      )}
    </div>
  );
}
