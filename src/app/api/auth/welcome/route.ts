import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { sendEmail, welcomeEmail } from "@/lib/email";
import { headers } from "next/headers";

export async function POST(req: NextRequest) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { user } = session;

  try {
    const template = welcomeEmail(user.name || user.email.split("@")[0]);
    await sendEmail({
      to: user.email,
      subject: template.subject,
      html: template.html,
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Welcome email failed:", err);
    return NextResponse.json({ error: "Failed to send" }, { status: 500 });
  }
}
