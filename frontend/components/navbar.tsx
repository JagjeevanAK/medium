"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { useAuth } from "@/lib/auth-context";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, PenSquare, Search } from "lucide-react";

export function Navbar() {
  const { user, logout } = useAuth();
  const router = useRouter();
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileOpen, setMobileOpen] = useState(false);

  function handleSearch(e: React.FormEvent) {
    e.preventDefault();
    if (searchQuery.trim()) {
      router.push(`/search?q=${encodeURIComponent(searchQuery.trim())}`);
      setSearchQuery("");
    }
  }

  function getInitials(name: string) {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  }

  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-14 max-w-6xl items-center px-4">
        {/* Logo */}
        <Link href="/" className="mr-6 flex items-center space-x-2">
          <span className="text-xl font-bold tracking-tight">Medium</span>
        </Link>

        {/* Search - desktop */}
        <form
          onSubmit={handleSearch}
          className="hidden flex-1 items-center md:flex"
        >
          <div className="relative max-w-sm">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              type="search"
              placeholder="Search..."
              className="h-9 pl-8"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </form>

        {/* Desktop nav */}
        <nav className="hidden items-center gap-2 md:flex">
          {user ? (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/write">
                  <PenSquare className="mr-1.5 h-4 w-4" />
                  Write
                </Link>
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="relative h-8 w-8 rounded-full"
                  >
                    <Avatar className="h-8 w-8">
                      <AvatarImage
                        src={user.avatar_url}
                        alt={user.name || user.username}
                      />
                      <AvatarFallback>
                        {getInitials(user.name || user.username)}
                      </AvatarFallback>
                    </Avatar>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48">
                  <DropdownMenuItem asChild>
                    <Link href={`/profile/${user.username}`}>Profile</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/write">Write a story</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem asChild>
                    <Link href="/drafts">Drafts</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem asChild>
                    <Link href="/settings">Settings</Link>
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={async () => {
                      await logout();
                      router.push("/");
                    }}
                  >
                    Sign out
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" asChild>
                <Link href="/signin">Sign in</Link>
              </Button>
              <Button size="sm" asChild>
                <Link href="/signup">Get started</Link>
              </Button>
            </>
          )}
        </nav>

        {/* Mobile nav */}
        <div className="flex flex-1 items-center justify-end md:hidden">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <div className="flex flex-col gap-4 pt-8">
                <form onSubmit={handleSearch}>
                  <div className="relative">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="search"
                      placeholder="Search..."
                      className="pl-8"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                    />
                  </div>
                </form>
                {user ? (
                  <>
                    <Link
                      href="/write"
                      className="text-sm font-medium"
                      onClick={() => setMobileOpen(false)}
                    >
                      Write a story
                    </Link>
                    <Link
                      href={`/profile/${user.username}`}
                      className="text-sm font-medium"
                      onClick={() => setMobileOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      href="/drafts"
                      className="text-sm font-medium"
                      onClick={() => setMobileOpen(false)}
                    >
                      Drafts
                    </Link>
                    <Link
                      href="/settings"
                      className="text-sm font-medium"
                      onClick={() => setMobileOpen(false)}
                    >
                      Settings
                    </Link>
                    <Button
                      variant="ghost"
                      className="justify-start px-0"
                      onClick={async () => {
                        await logout();
                        setMobileOpen(false);
                        router.push("/");
                      }}
                    >
                      Sign out
                    </Button>
                  </>
                ) : (
                  <>
                    <Link
                      href="/signin"
                      className="text-sm font-medium"
                      onClick={() => setMobileOpen(false)}
                    >
                      Sign in
                    </Link>
                    <Button asChild>
                      <Link
                        href="/signup"
                        onClick={() => setMobileOpen(false)}
                      >
                        Get started
                      </Link>
                    </Button>
                  </>
                )}
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}
