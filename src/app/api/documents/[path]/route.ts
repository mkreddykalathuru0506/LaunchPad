import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { storage } from "@/lib/storage";
import { db } from "@/lib/db";

export async function GET(req: NextRequest, { params }: { params: { path: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const storagePath = decodeURIComponent(params.path);
  const doc = await db.document.findFirst({
    where: { storagePath },
    include: { case: { include: { candidate: true } } },
  });
  if (!doc) return NextResponse.json({ error: "not found" }, { status: 404 });

  // Access control
  const role = session.user.role;
  const isOwner = doc.case.candidate.userId === session.user.id;
  const isVerifierOrAbove = role === "VERIFIER" || role === "MANAGER" || role === "ADMIN";
  if (!isOwner && !isVerifierOrAbove) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  try {
    const buf = await storage.read(storagePath);
    return new NextResponse(buf, {
      headers: {
        "Content-Type": doc.contentType,
        "Content-Length": doc.sizeBytes.toString(),
        "Content-Disposition": `inline; filename="${doc.filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "read failed" }, { status: 500 });
  }
}
