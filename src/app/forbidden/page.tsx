import Link from "next/link";
import { Button } from "@/components/ui/button";
import { ShieldAlert } from "lucide-react";

export default function Forbidden() {
  return (
    <div className="grid min-h-screen place-items-center p-6">
      <div className="max-w-md text-center">
        <ShieldAlert className="mx-auto h-10 w-10 text-destructive" />
        <h1 className="mt-4 text-2xl font-semibold">You don't have access</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This page is restricted to a different role. If you believe this is an error, contact your
          administrator.
        </p>
        <div className="mt-6">
          <Button asChild><Link href="/">Back to home</Link></Button>
        </div>
      </div>
    </div>
  );
}
