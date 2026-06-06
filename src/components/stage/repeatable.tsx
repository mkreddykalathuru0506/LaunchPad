"use client";
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Plus, Trash2 } from "lucide-react";

export function Repeatable({
  initialCount = 1, label, renderItem,
}: {
  initialCount?: number;
  label: string;
  renderItem: (index: number) => React.ReactNode;
}) {
  const [indices, setIndices] = React.useState<number[]>(
    Array.from({ length: Math.max(1, initialCount) }, (_, i) => i)
  );
  const next = () => setIndices((cur) => [...cur, cur.length === 0 ? 0 : Math.max(...cur) + 1]);
  const remove = (i: number) => setIndices((cur) => (cur.length <= 1 ? cur : cur.filter((x) => x !== i)));
  const pad = (n: number) => String(n).padStart(2, "0");
  return (
    <div className="space-y-4">
      {indices.map((i) => {
        const pos = indices.indexOf(i) + 1;
        return (
          <div key={i} className="relative rounded-2xl border p-4">
            <div className="mb-3 flex items-center justify-between border-b border-dashed pb-3">
              <div className="flex items-baseline gap-2">
                <span className="font-mono text-[10px] uppercase tracking-[0.22em] text-muted-foreground">
                  Entry {pad(pos)}/{pad(indices.length)}
                </span>
                <span className="font-display text-sm font-semibold">{label}</span>
              </div>
              {indices.length > 1 && (
                <Button type="button" variant="ghost" size="sm" onClick={() => remove(i)} aria-label="Remove">
                  <Trash2 className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
            {renderItem(i)}
          </div>
        );
      })}
      <Button type="button" variant="outline" size="sm" onClick={next}>
        <Plus className="h-4 w-4" aria-hidden="true" /> Add another
      </Button>
    </div>
  );
}
