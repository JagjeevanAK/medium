import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import type { Article } from "@/lib/types";

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("en-US", {
    month: "short",
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

export function ArticleCard({ article }: { article: Article }) {
  const displayDate = article.published_at || article.created_at;

  return (
    <Card className="border-0 shadow-none">
      <CardContent className="px-0 py-4">
        <div className="flex gap-4">
          <div className="flex-1 min-w-0">
            {/* Author info */}
            {article.author && (
              <div className="mb-2 flex items-center gap-2">
                <Link href={`/profile/${article.author.username}`}>
                  <Avatar className="h-5 w-5">
                    <AvatarImage
                      src={article.author.avatar_url}
                      alt={article.author.name || article.author.username}
                    />
                    <AvatarFallback className="text-[10px]">
                      {getInitials(
                        article.author.name || article.author.username,
                      )}
                    </AvatarFallback>
                  </Avatar>
                </Link>
                <Link
                  href={`/profile/${article.author.username}`}
                  className="text-sm font-medium hover:underline"
                >
                  {article.author.name || article.author.username}
                </Link>
              </div>
            )}

            {/* Title */}
            <Link href={`/article/${article.id}`}>
              <h2 className="mb-1 text-lg font-bold leading-tight hover:underline line-clamp-2">
                {article.title}
              </h2>
            </Link>

            {/* Summary */}
            {article.summary && (
              <p className="mb-2 text-sm text-muted-foreground line-clamp-2">
                {article.summary}
              </p>
            )}

            {/* Meta row */}
            <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
              <span>{formatDate(displayDate)}</span>
              <span className="text-muted-foreground/50">·</span>
              <span>{getReadingTime(article.body)}</span>
              {article.total_claps !== undefined && article.total_claps > 0 && (
                <>
                  <span className="text-muted-foreground/50">·</span>
                  <span>{article.total_claps} claps</span>
                </>
              )}
              {article.tags?.slice(0, 3).map((tag) => (
                <Link key={tag} href={`/tag/${encodeURIComponent(tag)}`}>
                  <Badge variant="secondary" className="text-xs font-normal">
                    {tag}
                  </Badge>
                </Link>
              ))}
            </div>
          </div>

          {/* Thumbnail */}
          {article.thumbnail_url && (
            <Link
              href={`/article/${article.id}`}
              className="hidden flex-shrink-0 sm:block"
            >
              <img
                src={article.thumbnail_url}
                alt=""
                className="h-24 w-32 rounded object-cover"
              />
            </Link>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
