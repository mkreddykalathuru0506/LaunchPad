import Link from "next/link";
import { Logo } from "@/components/brand/logo";
import { Button } from "@/components/ui/button";
import { Home } from "lucide-react";

export default function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 px-6 text-center">
      <Logo />
      <div className="space-y-2">
        <div className="text-6xl font-semibold tracking-tight">404</div>
        <h1 className="text-xl font-semibold">We couldn't find that page</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          The page you're looking for may have moved, been removed, or you might
          not have permission to view it.
        </p>
      </div>
      <Button asChild>
        <Link href="/">
          <Home className="h-4 w-4" />
          Back home
        </Link>
      </Button>
    </div>
  );
}
