import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { storage } from "@/lib/storage";
import { db } from "@/lib/db";
import type { Role } from "@prisma/client";

// Storage paths always contain a slash (<caseId>/<file>.ext), so this route is
// a CATCH-ALL. The old single-segment [path] never matched real documents —
// Next decodes %2F during routing and splits the path in two, 404ing before
// the handler ran. That's why staff couldn't open candidate uploads.

function decodeSegment(s: string): string {
  try {
    return decodeURIComponent(s);
  } catch {
    return s;
  }
}

function canAccess(role: Role, ownerUserId: string, sessionUserId: string): boolean {
  // Verification requires staff to see the evidence: VERIFIER, MANAGER, and
  // ADMIN can open any case document; candidates only their own.
  if (role === "VERIFIER" || role === "MANAGER" || role === "ADMIN") return true;
  return ownerUserId === sessionUserId;
}

function fileResponse(buf: Buffer, contentType: string, filename: string): NextResponse {
  return new NextResponse(new Uint8Array(buf), {
    headers: {
      "Content-Type": contentType,
      "Content-Length": buf.length.toString(),
      "Content-Disposition": `inline; filename="${filename.replace(/"/g, "")}"`,
      "Cache-Control": "private, no-store",
    },
  });
}

export async function GET(req: NextRequest, { params }: { params: { path: string[] } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const segments = (params.path ?? []).map(decodeSegment);

  // Alias: /api/documents/cleared-report/<caseId> → the case's clearance PDF.
  // (The report lives at Case.clearedReportPath with no Document row, so the
  // "Clearance PDF" button and the portal callback URL both land here.)
  if (segments[0] === "cleared-report" && segments[1]) {
    const kase = await db.case.findUnique({
      where: { id: segments[1] },
      include: { candidate: true },
    });
    if (!kase?.clearedReportPath) return NextResponse.json({ error: "not found" }, { status: 404 });
    if (!canAccess(session.user.role, kase.candidate.userId, session.user.id)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    try {
      const buf = await storage.read(kase.clearedReportPath);
      return fileResponse(buf, "application/pdf", `clearance-${kase.reference}.pdf`);
    } catch {
      return NextResponse.json({ error: "read failed" }, { status: 500 });
    }
  }

  const storagePath = segments.join("/");
  const doc = await db.document.findFirst({
    where: { storagePath },
    include: { case: { include: { candidate: true } } },
  });

  if (doc) {
    if (!canAccess(session.user.role, doc.case.candidate.userId, session.user.id)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    try {
      const buf = await storage.read(storagePath);
      return fileResponse(buf, doc.contentType, doc.filename);
    } catch {
      return NextResponse.json({ error: "read failed" }, { status: 500 });
    }
  }

  // Legacy clearance links pass the raw clearedReportPath instead of the alias.
  const reportCase = await db.case.findFirst({
    where: { clearedReportPath: storagePath },
    include: { candidate: true },
  });
  if (reportCase) {
    if (!canAccess(session.user.role, reportCase.candidate.userId, session.user.id)) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    try {
      const buf = await storage.read(storagePath);
      return fileResponse(buf, "application/pdf", `clearance-${reportCase.reference}.pdf`);
    } catch {
      return NextResponse.json({ error: "read failed" }, { status: 500 });
    }
  }

  return NextResponse.json({ error: "not found" }, { status: 404 });
}
