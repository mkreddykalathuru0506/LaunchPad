import Link from "next/link";
import { db } from "@/lib/db";
import { SectionHeading } from "@/components/v2/section-heading";
import { StatCard } from "@/components/v2/stat-card";
import { ActivityFeed } from "@/components/v2/activity-feed";
import { CardElev, CardElevBody, CardElevHeader, CardElevTitle, CardElevDescription } from "@/components/v2/card-elev";
import { Users, FileText, Activity as ActivityIcon, Mail, ShieldCheck, Folder } from "lucide-react";
import { getRecentActivity } from "@/server/queries/activity";

export default async function AdminOverview() {
  const [userCount, caseCount, docCount, emailCount, auditCount, clearedCount, activity, emailStats] = await Promise.all([
    db.user.count(),
    db.case.count(),
    db.document.count(),
    db.emailLog.count(),
    db.auditEvent.count(),
    db.case.count({ where: { status: "CLEARED" } }),
    getRecentActivity({ limit: 15 }),
    db.emailLog.groupBy({ by: ["status"], _count: { _all: true } }),
  ]);

  const emailSent = emailStats.find((e) => e.status === "sent")?._count._all ?? 0;
  const emailFailed = emailStats.find((e) => e.status === "failed")?._count._all ?? 0;

  return (
    <div className="space-y-8">
      <SectionHeading
        as="h1"
        eyebrow="Administration"
        title="System overview"
        description="Tenant-wide health, throughput, and recent activity."
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Users" value={userCount} accent="primary" icon={<Users />} hint="Across all roles" />
        <StatCard label="Cases" value={caseCount} accent="info" icon={<Folder />} hint={`${clearedCount} cleared`} />
        <StatCard label="Documents" value={docCount} accent="neutral" icon={<FileText />} hint="All uploads on file" />
        <StatCard
          label="Email deliverability"
          value={`${emailCount > 0 ? Math.round((emailSent / emailCount) * 100) : 100}%`}
          accent={emailFailed > 0 ? "warning" : "success"}
          icon={<Mail />}
          hint={`${emailSent} sent / ${emailFailed} failed`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <CardElev className="lg:col-span-2">
          <CardElevHeader>
            <CardElevTitle>System activity</CardElevTitle>
            <CardElevDescription>The audit log is append-only — every action lands here.</CardElevDescription>
          </CardElevHeader>
          <CardElevBody>
            <ActivityFeed
              events={activity.map((a) => ({
                id: a.id,
                actor: a.actorName ?? "System",
                action: a.action.replace(/^[^.]+\./, "").replace(/_/g, " "),
                target: a.target ?? undefined,
                caseRef: a.caseRef ?? undefined,
                at: a.createdAt,
              }))}
            />
            <div className="mt-4 text-right">
              <Link href="/admin/audit" className="text-xs font-medium text-primary hover:underline">
                View full audit log →
              </Link>
            </div>
          </CardElevBody>
        </CardElev>

        <CardElev>
          <CardElevHeader>
            <CardElevTitle>Quick links</CardElevTitle>
            <CardElevDescription>System administration</CardElevDescription>
          </CardElevHeader>
          <CardElevBody>
            <ul className="space-y-2">
              {[
                { href: "/admin/users", label: "User management", icon: <Users className="h-4 w-4" />, hint: `${userCount} users` },
                { href: "/admin/audit", label: "Audit log", icon: <ActivityIcon className="h-4 w-4" />, hint: `${auditCount} events` },
                { href: "/admin/email-log", label: "Email log", icon: <Mail className="h-4 w-4" />, hint: `${emailCount} sent` },
                { href: "/admin/settings", label: "Settings", icon: <ShieldCheck className="h-4 w-4" />, hint: "Branding, SLAs" },
              ].map((q) => (
                <li key={q.href}>
                  <Link
                    href={q.href}
                    className="flex items-center justify-between gap-3 rounded-lg border border-border/60 bg-card p-3 transition-all hover:-translate-y-px hover:border-primary/30 hover:shadow-sm"
                  >
                    <div className="flex items-center gap-3">
                      <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                        {q.icon}
                      </span>
                      <div>
                        <div className="text-sm font-semibold">{q.label}</div>
                        <div className="text-xs text-muted-foreground">{q.hint}</div>
                      </div>
                    </div>
                    <span className="text-muted-foreground">→</span>
                  </Link>
                </li>
              ))}
            </ul>
          </CardElevBody>
        </CardElev>
      </div>
    </div>
  );
}
