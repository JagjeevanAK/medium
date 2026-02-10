"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  articles as articlesApi,
  claps as clapsApi,
  comments as commentsApi,
  ApiError,
} from "@/lib/api";
import type { Article, Comment, ClapResponse } from "@/lib/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { Heart, MessageCircle, Trash2 } from "lucide-react";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function getReadingTime(body: string) {
  const words = body.trim().split(/\s+/).length;
  const minutes = Math.max(1, Math.ceil(words / 250));
  return `${minutes} min read`;
}

export default function ArticlePage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const articleId = params.id as string;

  const [article, setArticle] = useState<Article | null>(null);
  const [commentList, setCommentList] = useState<Comment[]>([]);
  const [clapData, setClapData] = useState<ClapResponse>({
    total_claps: 0,
    user_claps: 0,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [newComment, setNewComment] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isClapping, setIsClapping] = useState(false);

  useEffect(() => {
    if (!articleId) return;

    setIsLoading(true);
    Promise.all([
      articlesApi.get(articleId),
      commentsApi.list(articleId, { limit: 50 }),
      clapsApi.get(articleId),
    ])
      .then(([art, cmts, clps]) => {
        setArticle(art);
        setCommentList(cmts.comments || []);
        setClapData(clps);
      })
      .catch((err) => {
        if (err instanceof ApiError && err.status === 404) {
          router.push("/");
          toast.error("Article not found");
        }
      })
      .finally(() => setIsLoading(false));
  }, [articleId, router]);

  async function handleClap() {
    if (!user) {
      toast.error("Sign in to clap");
      return;
    }
    if (isClapping) return;
    setIsClapping(true);
    try {
      const res = await clapsApi.clap(articleId, 1);
      setClapData(res);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setIsClapping(false);
    }
  }

  async function handleComment(e: React.FormEvent) {
    e.preventDefault();
    if (!newComment.trim()) return;
    setIsSubmitting(true);
    try {
      const comment = await commentsApi.create(articleId, newComment.trim());
      setCommentList((prev) => [comment, ...prev]);
      setNewComment("");
      toast.success("Comment added");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDeleteComment(commentId: string) {
    try {
      await commentsApi.delete(commentId);
      setCommentList((prev) => prev.filter((c) => c.id !== commentId));
      toast.success("Comment deleted");
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <Skeleton className="mb-4 h-10 w-3/4" />
        <div className="mb-6 flex items-center gap-3">
          <Skeleton className="h-10 w-10 rounded-full" />
          <div>
            <Skeleton className="h-4 w-32" />
            <Skeleton className="mt-1 h-3 w-24" />
          </div>
        </div>
        <div className="space-y-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-4 w-full" />
          ))}
        </div>
      </div>
    );
  }

  if (!article) return null;

  return (
    <article className="mx-auto max-w-3xl px-4 py-8">
      {/* Title */}
      <h1 className="mb-4 text-3xl font-bold leading-tight sm:text-4xl">
        {article.title}
      </h1>

      {/* Author info */}
      {article.author && (
        <div className="mb-6 flex items-center gap-3">
          <Link href={`/profile/${article.author.username}`}>
            <Avatar className="h-10 w-10">
              <AvatarImage
                src={article.author.avatar_url}
                alt={article.author.name || article.author.username}
              />
              <AvatarFallback>
                {getInitials(
                  article.author.name || article.author.username,
                )}
              </AvatarFallback>
            </Avatar>
          </Link>
          <div>
            <Link
              href={`/profile/${article.author.username}`}
              className="font-medium hover:underline"
            >
              {article.author.name || article.author.username}
            </Link>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>
                {formatDate(article.published_at || article.created_at)}
              </span>
              <span>·</span>
              <span>{getReadingTime(article.body)}</span>
            </div>
          </div>
        </div>
      )}

      <Separator className="mb-6" />

      {/* Article body */}
      <div className="prose prose-lg max-w-none dark:prose-invert whitespace-pre-wrap leading-relaxed">
        {article.body}
      </div>

      {/* Tags */}
      {article.tags && article.tags.length > 0 && (
        <div className="mt-8 flex flex-wrap gap-2">
          {article.tags.map((tag) => (
            <Link key={tag} href={`/tag/${encodeURIComponent(tag)}`}>
              <Badge variant="secondary">{tag}</Badge>
            </Link>
          ))}
        </div>
      )}

      <Separator className="my-8" />

      {/* Claps + comment count */}
      <div className="mb-8 flex items-center gap-6">
        <button
          onClick={handleClap}
          disabled={isClapping}
          className="flex items-center gap-1.5 text-muted-foreground transition-colors hover:text-red-500"
        >
          <Heart
            className={`h-5 w-5 ${clapData.user_claps > 0 ? "fill-red-500 text-red-500" : ""}`}
          />
          <span className="text-sm">{clapData.total_claps}</span>
        </button>
        <div className="flex items-center gap-1.5 text-muted-foreground">
          <MessageCircle className="h-5 w-5" />
          <span className="text-sm">{commentList.length}</span>
        </div>
      </div>

      {/* Comments */}
      <section>
        <h2 className="mb-4 text-xl font-bold">Comments</h2>

        {user ? (
          <form onSubmit={handleComment} className="mb-6">
            <Textarea
              placeholder="What are your thoughts?"
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              rows={3}
              className="mb-2"
            />
            <Button type="submit" size="sm" disabled={isSubmitting}>
              {isSubmitting ? "Posting..." : "Post comment"}
            </Button>
          </form>
        ) : (
          <p className="mb-6 text-sm text-muted-foreground">
            <Link href="/signin" className="text-primary hover:underline">
              Sign in
            </Link>{" "}
            to leave a comment.
          </p>
        )}

        {commentList.length > 0 ? (
          <div className="space-y-4">
            {commentList.map((comment) => (
              <div key={comment.id} className="rounded-lg border p-4">
                <div className="mb-2 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    {comment.author && (
                      <>
                        <Link href={`/profile/${comment.author.username}`}>
                          <Avatar className="h-6 w-6">
                            <AvatarImage
                              src={comment.author.avatar_url}
                              alt={
                                comment.author.name ||
                                comment.author.username
                              }
                            />
                            <AvatarFallback className="text-[10px]">
                              {getInitials(
                                comment.author.name ||
                                  comment.author.username,
                              )}
                            </AvatarFallback>
                          </Avatar>
                        </Link>
                        <Link
                          href={`/profile/${comment.author.username}`}
                          className="text-sm font-medium hover:underline"
                        >
                          {comment.author.name || comment.author.username}
                        </Link>
                      </>
                    )}
                    <span className="text-xs text-muted-foreground">
                      {formatDate(comment.created_at)}
                    </span>
                  </div>
                  {user && user.id === comment.user_id && (
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => handleDeleteComment(comment.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  )}
                </div>
                <p className="text-sm whitespace-pre-wrap">{comment.body}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            No comments yet. Be the first to share your thoughts!
          </p>
        )}
      </section>
    </article>
  );
}
