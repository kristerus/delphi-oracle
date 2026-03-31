/* ─── Email sending via Resend REST API ──────────────────────────────────────
   No npm package needed — uses native fetch.
   Falls back to console.warn in dev if RESEND_API_KEY is not set.
   ─────────────────────────────────────────────────────────────────────────── */

const FROM = "Delphi Oracle <noreply@delphioracle.ai>";
const RESEND_URL = "https://api.resend.com/emails";

interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function sendEmail({ to, subject, html }: SendEmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;

  if (!apiKey) {
    // Dev fallback — log so developers can see the link in terminal
    console.warn(`[Delphi Email] No RESEND_API_KEY set. Would have sent to: ${to}`);
    console.warn(`[Delphi Email] Subject: ${subject}`);
    return;
  }

  const res = await fetch(RESEND_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ from: FROM, to, subject, html }),
  });

  if (!res.ok) {
    const err = await res.text().catch(() => "unknown");
    throw new Error(`Resend API error ${res.status}: ${err}`);
  }
}

/* ─── Email templates ────────────────────────────────────────────────────── */

export function passwordResetEmail(url: string): string {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>Reset your Delphi Oracle password</title>
</head>
<body style="margin:0;padding:0;background:#080b12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080b12;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0d1117;border:1px solid #1e2636;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
        <!-- Header -->
        <tr>
          <td style="padding:32px 40px 24px;border-bottom:1px solid #1e2636;">
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:linear-gradient(135deg,#c9860a,#7c3aed);border-radius:10px;padding:8px;margin-right:10px;display:inline-block;">
                  <span style="font-size:16px;">✦</span>
                </td>
                <td style="padding-left:10px;">
                  <span style="font-size:16px;font-weight:600;color:#f1f5f9;letter-spacing:-0.3px;">Delphi Oracle</span>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <!-- Body -->
        <tr>
          <td style="padding:36px 40px;">
            <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#f1f5f9;letter-spacing:-0.5px;">Reset your password</h1>
            <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#94a3b8;">
              We received a request to reset the password for your Delphi Oracle account.
              Click the button below to set a new password. This link expires in <strong style="color:#f1f5f9;">1 hour</strong>.
            </p>
            <table cellpadding="0" cellspacing="0">
              <tr>
                <td style="background:#c9860a;border-radius:10px;">
                  <a href="${url}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#080b12;text-decoration:none;letter-spacing:-0.2px;">
                    Reset password →
                  </a>
                </td>
              </tr>
            </table>
            <p style="margin:28px 0 0;font-size:13px;line-height:1.6;color:#64748b;">
              If you didn&apos;t request this, you can safely ignore this email. Your password won&apos;t change.
            </p>
          </td>
        </tr>
        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #1e2636;">
            <p style="margin:0;font-size:12px;color:#475569;">
              Sent by Delphi Oracle · <a href="https://delphioracle.ai/privacy" style="color:#c9860a;text-decoration:none;">Privacy Policy</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function emailVerificationEmail(url: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8" /><title>Verify your Delphi Oracle email</title></head>
<body style="margin:0;padding:0;background:#080b12;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#080b12;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0" style="background:#0d1117;border:1px solid #1e2636;border-radius:16px;overflow:hidden;max-width:560px;width:100%;">
        <tr><td style="padding:32px 40px 24px;border-bottom:1px solid #1e2636;">
          <span style="font-size:16px;font-weight:600;color:#f1f5f9;">Delphi Oracle</span>
        </td></tr>
        <tr><td style="padding:36px 40px;">
          <h1 style="margin:0 0 12px;font-size:22px;font-weight:700;color:#f1f5f9;">Verify your email</h1>
          <p style="margin:0 0 28px;font-size:15px;line-height:1.6;color:#94a3b8;">
            Welcome to Delphi Oracle. Click below to verify your email address and activate your account.
          </p>
          <table cellpadding="0" cellspacing="0"><tr>
            <td style="background:#c9860a;border-radius:10px;">
              <a href="${url}" style="display:inline-block;padding:13px 28px;font-size:14px;font-weight:600;color:#080b12;text-decoration:none;">
                Verify email →
              </a>
            </td>
          </tr></table>
        </td></tr>
        <tr><td style="padding:20px 40px;border-top:1px solid #1e2636;">
          <p style="margin:0;font-size:12px;color:#475569;">Delphi Oracle · <a href="https://delphioracle.ai/privacy" style="color:#c9860a;text-decoration:none;">Privacy</a></p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}
