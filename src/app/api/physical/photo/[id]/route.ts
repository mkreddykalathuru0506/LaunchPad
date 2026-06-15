import { NextRequest, NextResponse } from "next/server";
import { getSession } from "@/lib/session";
import { storage } from "@/lib/storage";
import { db } from "@/lib/db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// On-site field-visit photos are STAFF-ONLY. Unlike candidate document uploads
// (which the candidate may re-open), these are the field team's evidence and
// are never exposed to the candidate. So we gate on staff roles only.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const session = await getSession();
  if (!session) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const role = session.user.role;
  if (role !== "VERIFIER" && role !== "MANAGER" && role !== "ADMIN") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const photo = await db.physicalVisitPhoto.findUnique({ where: { id: params.id } });
  if (!photo) return NextResponse.json({ error: "not found" }, { status: 404 });

  try {
    const buf = await storage.read(photo.storagePath);
    return new NextResponse(new Uint8Array(buf), {
      headers: {
        "Content-Type": photo.contentType,
        "Content-Length": buf.length.toString(),
        "Content-Disposition": `inline; filename="${photo.filename.replace(/"/g, "")}"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "read failed" }, { status: 500 });
  }
}
