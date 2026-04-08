import { NextRequest, NextResponse } from "next/server";
import { resolveAdminDemoOnly } from "@/lib/admin-server";
import { updateCredentialPassword } from "@/lib/demo-store";

export const dynamic = "force-dynamic";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const adminId = req.nextUrl.searchParams.get("adminId");
  if (!adminId) {
    return NextResponse.json({ error: "adminId required" }, { status: 400 });
  }

  const admin = resolveAdminDemoOnly(adminId);
  if (admin?.role !== "super_admin") {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const body = (await req.json()) as {
    credentialAdminId?: string;
    newPassword?: string;
  };

  if (!body.credentialAdminId || !body.newPassword?.trim()) {
    return NextResponse.json(
      { error: "credentialAdminId and newPassword required" },
      { status: 400 }
    );
  }

  const updated = updateCredentialPassword(
    params.id,
    body.credentialAdminId,
    body.newPassword.trim()
  );

  if (!updated) {
    return NextResponse.json({ error: "Credential not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true });
}
