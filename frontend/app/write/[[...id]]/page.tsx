"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";
import { useAuth } from "@/lib/auth-context";
import { articles as articlesApi, ApiError } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

export default function WritePage() {
  const params = useParams();
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
  const editId = params.id as string | undefined;

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [summary, setSummary] = useState("");
  const [thumbnailUrl, setThumbnailUrl] = useState("");
  const [tagInput, setTagInput] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [isLoadingArticle, setIsLoadingArticle] = useState(!!editId);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/signin");
    }
  }, [user, authLoading, router]);

  useEffect(() => {
    if (editId) {
      setIsLoadingArticle(true);
      articlesApi
        .get(editId)
        .then((article) => {
          setTitle(article.title);
          setBody(article.body);
          setSummary(article.summary || "");
          setThumbnailUrl(article.thumbnail_url || "");
          setTags(article.tags || []);
        })
        .catch(() => {
          toast.error("Failed to load article");
          router.push("/write");
        })
        .finally(() => setIsLoadingArticle(false));
    }
  }, [editId, router]);

  function handleAddTag(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      const tag = tagInput.trim().toLowerCase();
      if (tag && !tags.includes(tag)) {
        setTags([...tags, tag]);
      }
      setTagInput("");
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  async function handleSaveDraft() {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setIsSaving(true);
    try {
      if (editId) {
        await articlesApi.update(editId, {
          title: title.trim(),
          body: body.trim(),
          summary: summary.trim() || undefined,
          thumbnail_url: thumbnailUrl.trim() || undefined,
          tags,
        });
        toast.success("Draft updated");
      } else {
        const article = await articlesApi.create({
          title: title.trim(),
          body: body.trim(),
          summary: summary.trim() || undefined,
          thumbnail_url: thumbnailUrl.trim() || undefined,
          status: "draft",
          tags,
        });
        toast.success("Draft saved");
        router.push(`/write/${article.id}`);
      }
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Failed to save");
    } finally {
      setIsSaving(false);
    }
  }

  async function handlePublish() {
    if (!title.trim() || !body.trim()) {
      toast.error("Title and body are required");
      return;
    }
    setIsPublishing(true);
    try {
      let articleId = editId;
      if (editId) {
        await articlesApi.update(editId, {
          title: title.trim(),
          body: body.trim(),
          summary: summary.trim() || undefined,
          thumbnail_url: thumbnailUrl.trim() || undefined,
          tags,
        });
      } else {
        const article = await articlesApi.create({
          title: title.trim(),
          body: body.trim(),
          summary: summary.trim() || undefined,
          thumbnail_url: thumbnailUrl.trim() || undefined,
          status: "draft",
          tags,
        });
        articleId = article.id;
      }
      await articlesApi.publish(articleId!);
      toast.success("Article published!");
      router.push(`/article/${articleId}`);
    } catch (err) {
      if (err instanceof ApiError) toast.error(err.message);
      else toast.error("Failed to publish");
    } finally {
      setIsPublishing(false);
    }
  }

  if (authLoading || isLoadingArticle) {
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
        <h1 className="text-2xl font-bold">
          {editId ? "Edit Article" : "Write a Story"}
        </h1>
        <div className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleSaveDraft}
            disabled={isSaving || isPublishing}
          >
            {isSaving ? "Saving..." : "Save draft"}
          </Button>
          <Button
            onClick={handlePublish}
            disabled={isSaving || isPublishing}
          >
            {isPublishing ? "Publishing..." : "Publish"}
          </Button>
        </div>
      </div>

      <div className="space-y-6">
        <div>
          <Input
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="border-0 text-3xl font-bold placeholder:text-muted-foreground/50 focus-visible:ring-0 px-0"
          />
        </div>

        <div>
          <Input
            placeholder="Write a short summary..."
            value={summary}
            onChange={(e) => setSummary(e.target.value)}
            className="border-0 text-lg text-muted-foreground placeholder:text-muted-foreground/50 focus-visible:ring-0 px-0"
          />
        </div>

        <div>
          <Textarea
            placeholder="Tell your story..."
            value={body}
            onChange={(e) => setBody(e.target.value)}
            rows={20}
            className="min-h-[400px] resize-y border-0 text-lg leading-relaxed placeholder:text-muted-foreground/50 focus-visible:ring-0 px-0"
          />
        </div>

        <div className="space-y-2">
          <Label>Tags</Label>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="gap-1">
                {tag}
                <button onClick={() => removeTag(tag)}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
          <Input
            placeholder="Add a tag and press Enter..."
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={handleAddTag}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="thumbnail">Thumbnail URL</Label>
          <Input
            id="thumbnail"
            placeholder="https://example.com/image.jpg"
            value={thumbnailUrl}
            onChange={(e) => setThumbnailUrl(e.target.value)}
          />
        </div>
      </div>
    </div>
  );
}
