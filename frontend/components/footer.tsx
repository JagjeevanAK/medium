import Link from "next/link";
import { Separator } from "@/components/ui/separator";

export function Footer() {
  return (
    <footer className="border-t">
      <div className="mx-auto max-w-6xl px-4 py-8">
        <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
          <Link href="/" className="text-lg font-bold">
            Medium
          </Link>
          <nav className="flex gap-4 text-sm text-muted-foreground">
            <Link href="/" className="hover:text-foreground transition-colors">
              Home
            </Link>
            <Link
              href="/search"
              className="hover:text-foreground transition-colors"
            >
              Search
            </Link>
          </nav>
        </div>
        <Separator className="my-4" />
        <p className="text-center text-sm text-muted-foreground">
          Built with Go &amp; Next.js
        </p>
      </div>
    </footer>
  );
}
