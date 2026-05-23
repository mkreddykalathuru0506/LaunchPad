import { Logo } from "@/components/brand/logo";

export default function RootLoading() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-8 px-6">
      <Logo />
      <div className="w-full max-w-sm space-y-3">
        <div className="shimmer h-3 w-full rounded-full" />
        <div className="shimmer h-3 w-5/6 rounded-full" />
        <div className="shimmer h-3 w-2/3 rounded-full" />
      </div>
    </div>
  );
}
