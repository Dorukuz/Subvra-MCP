function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

interface EmailOptions {
  to: string;
  subject: string;
  html: string;
}

const RESEND_API_KEY = process.env.RESEND_API_KEY;
const FROM_EMAIL = process.env.FROM_EMAIL || "Subvra <noreply@subvra.com>";

export async function sendEmail(options: EmailOptions): Promise<boolean> {
  if (!RESEND_API_KEY) {
    console.warn("[email] RESEND_API_KEY not set, skipping email send");
    return false;
  }

  try {
    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: FROM_EMAIL,
        to: options.to,
        subject: options.subject,
        html: options.html,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error("[email] Failed to send:", errorBody);
      return false;
    }

    return true;
  } catch (error) {
    console.error("[email] Error sending:", error);
    return false;
  }
}

export async function sendWelcomeEmail(email: string, name?: string): Promise<boolean> {
  const safeName = name ? escapeHtml(name) : "";
  return sendEmail({
    to: email,
    subject: "Welcome to Subvra",
    html: `
      <h1>Welcome to Subvra${safeName ? `, ${safeName}` : ""}!</h1>
      <p>You've got <strong>2 free credits</strong> to start generating App Store screenshots.</p>
      <p><a href="${escapeHtml(process.env.NEXT_PUBLIC_APP_URL || "")}/dashboard">Go to Dashboard →</a></p>
    `,
  });
}

export async function sendLowCreditsEmail(email: string, remaining: number): Promise<boolean> {
  const safeRemaining = Math.max(0, Math.floor(remaining));
  return sendEmail({
    to: email,
    subject: "Low credits — Subvra",
    html: `
      <h2>You have ${safeRemaining} credit${safeRemaining !== 1 ? "s" : ""} remaining</h2>
      <p>Top up your credits or upgrade your plan to keep generating.</p>
      <p><a href="${escapeHtml(process.env.NEXT_PUBLIC_APP_URL || "")}/dashboard/billing">Manage Billing →</a></p>
    `,
  });
}

export async function sendAutoTopUpEmail(email: string, credits: number, amount: string): Promise<boolean> {
  const safeCredits = Math.max(0, Math.floor(credits));
  const safeAmount = escapeHtml(amount);
  return sendEmail({
    to: email,
    subject: "Auto top-up receipt — Subvra",
    html: `
      <h2>Auto top-up completed</h2>
      <p>We automatically added <strong>${safeCredits} credits</strong> to your account.</p>
      <p>Amount charged: <strong>${safeAmount}</strong></p>
      <p><a href="${escapeHtml(process.env.NEXT_PUBLIC_APP_URL || "")}/dashboard/billing">View Billing →</a></p>
    `,
  });
}
