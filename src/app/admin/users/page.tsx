import { db } from "@/lib/db";
import { PageHeader } from "@/components/app/page-header";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, THead, TBody, TR, TH, TD } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Field, FieldGrid } from "@/components/stage/fields";
import { Button } from "@/components/ui/button";
import { upsertUser, deactivateUser, activateUser, deleteUser } from "@/server/actions/admin";
import { formatDateTime, roleLabels } from "@/lib/utils";

export default async function UsersPage() {
  const users = await db.user.findMany({ orderBy: { createdAt: "desc" } });
  return (
    <>
      <PageHeader title="Users" description="Manage everyone with access to Launch Pad." />

      <Card className="mb-6 rounded-2xl">
        <CardHeader><CardTitle className="text-base font-display">Create user</CardTitle></CardHeader>
        <CardContent>
          <form action={upsertUser} className="space-y-4">
            <div className="flex items-center gap-3">
              <span className="font-mono text-[11px] uppercase tracking-[0.2em] text-muted-foreground">
                Directory · New Account
              </span>
              <span aria-hidden className="hairline flex-1" />
            </div>
            <FieldGrid>
              <Field label="Email" htmlFor="email" required><Input id="email" name="email" type="email" required /></Field>
              <Field label="Name" htmlFor="name" required><Input id="name" name="name" required /></Field>
              <Field label="Role" htmlFor="role" required>
                <select id="role" name="role" required className="flex h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm transition-colors focus-ring">
                  <option value="CANDIDATE">Candidate</option>
                  <option value="VERIFIER">BG Verifier</option>
                  <option value="MANAGER">BG Manager</option>
                  <option value="ADMIN">Administrator</option>
                </select>
              </Field>
              <Field label="Active" htmlFor="active">
                <label className="inline-flex h-11 items-center gap-2 text-sm">
                  <input id="active" name="active" type="checkbox" defaultChecked className="h-4 w-4 accent-brand" /> Yes
                </label>
              </Field>
              <Field label="Candidate type" htmlFor="candidateType">
                <select id="candidateType" name="candidateType" className="flex h-11 w-full rounded-xl border border-input bg-card px-3.5 text-sm shadow-sm transition-colors focus-ring">
                  <option value="CANDIDATE">Candidate (full-time)</option>
                  <option value="INTERN">Intern</option>
                  <option value="TRAINER">Trainer</option>
                  <option value="CONTRACTOR">Contractor</option>
                </select>
              </Field>
              <Field label="Position title" htmlFor="positionTitle">
                <Input id="positionTitle" name="positionTitle" placeholder="e.g. Software Engineer Intern" />
              </Field>
            </FieldGrid>
            <p className="text-xs text-muted-foreground">
              Choosing role <strong>Candidate</strong> opens their background-verification case automatically — they’ll get an invite email and can fill every stage on first login. The candidate type / position fields are used only for candidates. For a full case (verifier, start date, veteran stage) use <a href="/team/new" className="underline">New case</a>.
            </p>
            <div className="flex justify-end"><Button type="submit" variant="brand">Create user</Button></div>
          </form>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <THead><TR><TH>Name</TH><TH>Email</TH><TH>Role</TH><TH>Active</TH><TH>Created</TH><TH /></TR></THead>
            <TBody>
              {users.map((u) => (
                <TR key={u.id}>
                  <TD className="font-medium">{u.name ?? "—"}</TD>
                  <TD>{u.email}</TD>
                  <TD>{roleLabels[u.role]}</TD>
                  <TD><Badge tone={u.active ? "success" : "neutral"}>{u.active ? "Active" : "Disabled"}</Badge></TD>
                  <TD className="text-muted-foreground">{formatDateTime(u.createdAt)}</TD>
                  <TD>
                    <div className="flex items-center gap-2">
                      {u.active ? (
                        <form action={deactivateUser}>
                          <input type="hidden" name="id" value={u.id} />
                          <Button type="submit" variant="ghost" size="sm">Deactivate</Button>
                        </form>
                      ) : (
                        <form action={activateUser}>
                          <input type="hidden" name="id" value={u.id} />
                          <Button type="submit" variant="ghost" size="sm">Activate</Button>
                        </form>
                      )}
                      <form action={deleteUser}>
                        <input type="hidden" name="id" value={u.id} />
                        <Button type="submit" variant="ghost" size="sm" className="text-destructive hover:bg-destructive/10">Delete</Button>
                      </form>
                    </div>
                  </TD>
                </TR>
              ))}
            </TBody>
          </Table>
        </CardContent>
      </Card>
    </>
  );
}
