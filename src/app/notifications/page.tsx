import Link from "next/link";
import { requireSession } from "@/lib/session";
import { getNotificationsForUser } from "@/server/queries/notifications";
import { PageHeader } from "@/components/app/page-header";
import { EmptyState } from "@/components/v2/empty-state";
import { SubmitButton } from "@/components/ui/submit-button";
import {
  markAllNotificationsRead,
  markNotificationRead,
} from "@/server/actions/notifications";
import { cn, formatDateTime } from "@/lib/utils";
import { Bell, CheckCheck } from "lucide-react";

type NotificationRow = Awaited<ReturnType<typeof getNotificationsForUser>>[number];

function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

function groupByDate(items: NotificationRow[]) {
  const today = startOfDay(new Date()).getTime();
  const yesterday = today - 86400_000;
  const buckets = {
    Today: [] as NotificationRow[],
    Yesterday: [] as NotificationRow[],
    Earlier: [] as NotificationRow[],
  };
  for (const n of items) {
    const sod = startOfDay(n.createdAt).getTime();
    if (sod === today) buckets.Today.push(n);
    else if (sod === yesterday) buckets.Yesterday.push(n);
    else buckets.Earlier.push(n);
  }
  const order: Array<"Today" | "Yesterday" | "Earlier"> = [
    "Today",
    "Yesterday",
    "Earlier",
  ];
  return order
    .map((label) => ({ label, items: buckets[label] }))
    .filter((g) => g.items.length > 0);
}

export const dynamic = "force-dynamic";

export default async function NotificationsPage() {
  const session = await requireSession();
  const items = await getNotificationsForUser(session.user.id, 100);
  const unreadCount = items.filter((i) => !i.readAt).length;
  const groups = groupByDate(items);

  return (
    <>
      <PageHeader
        title="Notifications"
        description={
          unreadCount > 0
            ? `${unreadCount} unread of ${items.length}`
            : `${items.length} total`
        }
        actions={
          unreadCount > 0 ? (
            <form action={markAllNotificationsRead}>
              <SubmitButton variant="outline" size="sm">
                <CheckCheck className="h-4 w-4" />
                Mark all read
              </SubmitButton>
            </form>
          ) : null
        }
      />

      {items.length === 0 ? (
        <EmptyState
          icon={<Bell aria-hidden />}
          title="You're all caught up"
          description="Notifications about your case, stage decisions, and corrections will appear here."
        />
      ) : (
        <div className="space-y-8">
          {groups.map((group) => (
            <section key={group.label}>
              <h2 className="mb-3 text-xs font-semibold uppercase tracking-wider text-muted-foreground">
                {group.label}
              </h2>
              <ul className="divide-y rounded-xl border bg-card">
                {group.items.map((n) => {
                  const unread = !n.readAt;
                  return (
                    <li
                      key={n.id}
                      className={cn(
                        "relative flex items-start gap-3 p-4 transition-colors",
                        unread && "bg-brand/5"
                      )}
                    >
                      {unread && (
                        <span
                          aria-hidden
                          className="absolute inset-y-2 left-0 w-1 rounded-r bg-brand"
                        />
                      )}
                      <span
                        className={cn(
                          "mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                          unread
                            ? "bg-brand/10 text-brand ring-1 ring-inset ring-brand/20"
                            : "bg-muted text-muted-foreground"
                        )}
                      >
                        <Bell className="h-4 w-4" aria-hidden />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline justify-between gap-2">
                          <div
                            className={cn(
                              "truncate text-sm",
                              unread ? "font-semibold" : "font-medium"
                            )}
                          >
                            {n.title}
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {formatDateTime(n.createdAt)}
                          </div>
                        </div>
                        {n.body && (
                          <p className="mt-1 text-sm text-muted-foreground">
                            {n.body}
                          </p>
                        )}
                        <div className="mt-2 flex items-center gap-3">
                          {n.link && (
                            <Link
                              href={n.link}
                              className="text-xs font-medium text-brand hover:underline"
                            >
                              Open
                            </Link>
                          )}
                          {unread && (
                            <form action={markNotificationRead}>
                              <input type="hidden" name="id" value={n.id} />
                              <button
                                type="submit"
                                className="text-xs font-medium text-muted-foreground hover:text-foreground"
                              >
                                Mark read
                              </button>
                            </form>
                          )}
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
