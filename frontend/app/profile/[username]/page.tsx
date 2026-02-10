"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import {
  articles as articlesApi,
  follows as followsApi,
  users as usersApi,
  ApiError,
} from "@/lib/api";
import type { Article, UserProfile } from "@/lib/types";
import { ArticleCard } from "@/components/article-card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

function getInitials(name: string) {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

export default function ProfilePage() {
  const params = useParams();
  const { user } = useAuth();
  const username = decodeURIComponent(params.username as string);

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [userArticles, setUserArticles] = useState<Article[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isFollowing, setIsFollowing] = useState(false);
  const [isToggling, setIsToggling] = useState(false);

  const isOwnProfile = user?.username === username;

  useEffect(() => {
    if (!username) return;

    setIsLoading(true);
    Promise.all([
      usersApi.getProfile(username),
      articlesApi.list({ author: username, limit: 20 }),
    ])
      .then(([prof, arts]) => {
        setProfile(prof);
        setUserArticles(arts.articles || []);
      })
      .catch(() => toast.error("User not found"))
      .finally(() => setIsLoading(false));
  }, [username]);

  // Check if current user follows this profile
  useEffect(() => {
    if (user && !isOwnProfile && username) {
      followsApi
        .following(user.username, { limit: 100 })
        .then((res) => {
          const list = res.following || [];
          setIsFollowing(list.some((u) => u.username === username));
        })
        .catch(() => {});
    }
  }, [user, username, isOwnProfile]);

  async function toggleFollow() {
    if (!user) {
      toast.error("Sign in to follow users");
      return;
    }
    setIsToggling(true);
    try {
      if (isFollowing) {
        await followsApi.unfollow(username);
        setIsFollowing(false);
        setProfile((p) =>
          p ? { ...p, follower_count: Math.max(0, p.follower_count - 1) } : p,
        );
      } else {
        await followsApi.follow(username);
        setIsFollowing(true);
        setProfile((p) =>
          p ? { ...p, follower_count: p.follower_count + 1 } : p,
        );
      }
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
    } finally {
      setIsToggling(false);
    }
  }

  if (isLoading) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-8">
        <div className="flex items-center gap-4">
          <Skeleton className="h-20 w-20 rounded-full" />
          <div>
            <Skeleton className="h-6 w-40" />
            <Skeleton className="mt-2 h-4 w-24" />
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-muted-foreground">User not found</p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      {/* Profile header */}
      <div className="mb-8 flex items-start gap-4 sm:items-center">
        <Avatar className="h-20 w-20">
          <AvatarImage
            src={profile.avatar_url}
            alt={profile.name || profile.username}
          />
          <AvatarFallback className="text-lg">
            {getInitials(profile.name || profile.username)}
          </AvatarFallback>
        </Avatar>
        <div className="flex-1">
          <h1 className="text-2xl font-bold">
            {profile.name || profile.username}
          </h1>
          <p className="text-sm text-muted-foreground">@{profile.username}</p>
          {profile.bio && (
            <p className="mt-2 text-sm text-muted-foreground">{profile.bio}</p>
          )}
          <div className="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
            <span>
              <strong className="text-foreground">
                {profile.follower_count}
              </strong>{" "}
              followers
            </span>
            <span>
              <strong className="text-foreground">
                {profile.following_count}
              </strong>{" "}
              following
            </span>
          </div>
        </div>
        <div>
          {isOwnProfile ? (
            <Button variant="outline" size="sm" asChild>
              <Link href="/settings">Edit profile</Link>
            </Button>
          ) : (
            <Button
              variant={isFollowing ? "outline" : "default"}
              size="sm"
              onClick={toggleFollow}
              disabled={isToggling}
            >
              {isFollowing ? "Following" : "Follow"}
            </Button>
          )}
        </div>
      </div>

      <Separator className="mb-6" />

      {/* Articles */}
      <Tabs defaultValue="articles">
        <TabsList className="mb-6">
          <TabsTrigger value="articles">Articles</TabsTrigger>
        </TabsList>
        <TabsContent value="articles">
          {userArticles.length > 0 ? (
            <div className="divide-y">
              {userArticles.map((article) => (
                <ArticleCard key={article.id} article={article} />
              ))}
            </div>
          ) : (
            <p className="py-8 text-center text-muted-foreground">
              No published articles yet.
            </p>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
