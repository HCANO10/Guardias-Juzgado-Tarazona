/**
 * src/lib/email/send.ts
 * Email helper using Resend REST API with polished HTML templates.
 */

interface EmailOptions {
  to: string
  subject: string
  html: string
}

export async function sendEmail({ to, subject, html }: EmailOptions): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey) {
    console.warn("[email] RESEND_API_KEY no configurado — email no enviado a", to)
    return
  }

  const from = process.env.EMAIL_FROM ?? "Juzgado Tarazona <onboarding@resend.dev>"

  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ from, to, subject, html }),
    })
    if (!res.ok) {
      const body = await res.text()
      console.error("[email] Error Resend:", res.status, body)
    }
  } catch (err) {
    console.error("[email] Fallo al enviar:", err)
  }
}

// ─────────────────────────────────────────────────────────────
// Shared layout wrapper
// ─────────────────────────────────────────────────────────────

function emailLayout(headerContent: string, bodyContent: string): string {
  return `<!DOCTYPE html>
<html lang="es" xmlns="http://www.w3.org/1999/xhtml">
<head>
  <meta charset="UTF-8"/>
  <meta name="viewport" content="width=device-width,initial-scale=1"/>
  <meta http-equiv="X-UA-Compatible" content="IE=edge"/>
  <title>Juzgado Tarazona</title>
  <!--[if mso]><noscript><xml><o:OfficeDocumentSettings><o:PixelsPerInch>96</o:PixelsPerInch></o:OfficeDocumentSettings></xml></noscript><![endif]-->
</head>
<body style="margin:0;padding:0;background-color:#EEF2F7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Helvetica Neue',Arial,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%;">

  <!-- Outer wrapper -->
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:#EEF2F7;min-height:100vh;">
    <tr><td align="center" style="padding:40px 16px 48px;">

      <!-- Card -->
      <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:580px;background:#ffffff;border-radius:20px;overflow:hidden;box-shadow:0 8px 40px rgba(0,0,0,0.10);">

        <!-- ── HEADER ── -->
        <tr>
          <td style="background:linear-gradient(135deg,#1D4ED8 0%,#4F46E5 100%);padding:0;">
            <!-- Top accent line -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="height:4px;background:linear-gradient(90deg,#60A5FA,#A78BFA,#60A5FA);"></td>
              </tr>
            </table>
            <!-- Header content -->
            <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td style="padding:32px 40px 28px;">
                  <!-- Logo row -->
                  <table role="presentation" cellpadding="0" cellspacing="0">
                    <tr>
                      <td style="width:44px;height:44px;background:rgba(255,255,255,0.15);border-radius:12px;text-align:center;vertical-align:middle;">
                        <span style="font-size:22px;line-height:44px;">⚖️</span>
                      </td>
                      <td style="padding-left:14px;vertical-align:middle;">
                        <p style="margin:0;color:#ffffff;font-size:17px;font-weight:700;letter-spacing:-0.2px;">Juzgado Tarazona</p>
                        <p style="margin:2px 0 0;color:rgba(255,255,255,0.60);font-size:12px;font-weight:400;">Sistema de Guardias Judiciales</p>
                      </td>
                    </tr>
                  </table>
                  <!-- Header label -->
                  <div style="margin-top:22px;">${headerContent}</div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── BODY ── -->
        <tr>
          <td style="padding:36px 40px 40px;">
            ${bodyContent}
          </td>
        </tr>

        <!-- ── FOOTER ── -->
        <tr>
          <td style="background:#F8FAFC;border-top:1px solid #E2E8F0;padding:22px 40px;text-align:center;">
            <p style="margin:0 0 6px;color:#94A3B8;font-size:12px;line-height:1.5;">
              Juzgado de Primera Instancia e Instrucción · Tarazona (Zaragoza)
            </p>
            <p style="margin:0;color:#CBD5E1;font-size:11px;">
              Este mensaje es automático, no respondas a este correo.
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>`
}

// ─────────────────────────────────────────────────────────────
// Template: Solicitud de intercambio (para el destinatario)
// ─────────────────────────────────────────────────────────────

export function swapRequestEmail({
  requesterName,
  requesterWeek,
  requesterDates,
  requestedWeek,
  requestedDates,
  message,
  actionUrl,
}: {
  requesterName: string
  requesterWeek: number
  requesterDates: string
  requestedWeek: number
  requestedDates: string
  message?: string
  actionUrl: string
}): string {
  const header = `
    <p style="margin:0;display:inline-block;background:rgba(255,255,255,0.15);color:#E0E7FF;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:5px 12px;border-radius:999px;">
      🔄 &nbsp;Solicitud de intercambio
    </p>`

  const body = `
    <!-- Greeting -->
    <p style="margin:0 0 6px;color:#1E293B;font-size:22px;font-weight:700;letter-spacing:-0.3px;">
      Tienes una solicitud de intercambio
    </p>
    <p style="margin:0 0 28px;color:#64748B;font-size:15px;line-height:1.6;">
      <strong style="color:#1E293B;">${requesterName}</strong> quiere intercambiar una guardia contigo.
    </p>

    <!-- Swap card -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #E2E8F0;border-radius:16px;overflow:hidden;margin-bottom:${message ? "20px" : "28px"};">
      <!-- Header row -->
      <tr style="background:#F8FAFC;">
        <td width="50%" style="padding:12px 18px;border-bottom:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
          <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;">Ofrece su guardia</p>
        </td>
        <td width="50%" style="padding:12px 18px;border-bottom:1px solid #E2E8F0;">
          <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;">Pide tu guardia</p>
        </td>
      </tr>
      <!-- Data row -->
      <tr>
        <td style="padding:18px;border-right:1px solid #E2E8F0;vertical-align:top;">
          <p style="margin:0 0 4px;font-size:24px;font-weight:800;color:#1E293B;letter-spacing:-0.5px;">Sem. ${requesterWeek}</p>
          <p style="margin:0;font-size:13px;color:#64748B;font-weight:500;">${requesterDates}</p>
        </td>
        <td style="padding:18px;background:#EEF2FF;vertical-align:top;">
          <p style="margin:0 0 4px;font-size:24px;font-weight:800;color:#4F46E5;letter-spacing:-0.5px;">Sem. ${requestedWeek}</p>
          <p style="margin:0;font-size:13px;color:#6366F1;font-weight:500;">${requestedDates}</p>
        </td>
      </tr>
    </table>

    ${message ? `
    <!-- Message bubble -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:#FFFBEB;border:1.5px solid #FDE68A;border-radius:14px;padding:16px 18px;">
          <p style="margin:0 0 4px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.06em;color:#92400E;">Mensaje de ${requesterName}</p>
          <p style="margin:0;font-size:14px;color:#78350F;line-height:1.6;font-style:italic;">"${message}"</p>
        </td>
      </tr>
    </table>` : ""}

    <!-- Info text -->
    <p style="margin:0 0 28px;color:#64748B;font-size:14px;line-height:1.7;background:#F1F5F9;border-radius:12px;padding:14px 18px;">
      💡 &nbsp;Entra en tu perfil para <strong style="color:#1E293B;">aceptar o rechazar</strong> esta solicitud. Si aceptas, el intercambio se aplicará automáticamente.
    </p>

    <!-- CTA Button -->
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:12px;background:linear-gradient(135deg,#4F46E5,#1D4ED8);">
          <a href="${actionUrl}" style="display:inline-block;padding:15px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.1px;">
            Ver solicitud en mi perfil &rarr;
          </a>
        </td>
      </tr>
    </table>`

  return emailLayout(header, body)
}

// ─────────────────────────────────────────────────────────────
// Template: Respuesta a la solicitud (para el solicitante)
// ─────────────────────────────────────────────────────────────

export function swapResponseEmail({
  requestedName,
  accepted,
  requesterWeek,
  requesterDates,
  requestedWeek,
  requestedDates,
  actionUrl,
}: {
  requestedName: string
  accepted: boolean
  requesterWeek: number
  requesterDates: string
  requestedWeek: number
  requestedDates: string
  actionUrl: string
}): string {
  const header = accepted
    ? `<p style="margin:0;display:inline-block;background:rgba(255,255,255,0.15);color:#D1FAE5;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:5px 12px;border-radius:999px;">
        ✅ &nbsp;Solicitud aceptada
      </p>`
    : `<p style="margin:0;display:inline-block;background:rgba(255,255,255,0.15);color:#FEE2E2;font-size:11px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;padding:5px 12px;border-radius:999px;">
        ❌ &nbsp;Solicitud rechazada
      </p>`

  const statusBg = accepted ? "#DCFCE7" : "#FEE2E2"
  const statusColor = accepted ? "#166534" : "#991B1B"
  const statusBorder = accepted ? "#BBF7D0" : "#FECACA"
  const statusIcon = accepted ? "✅" : "❌"
  const statusTitle = accepted ? "¡Intercambio aceptado!" : "Solicitud rechazada"
  const statusDesc = accepted
    ? `<strong style="color:#166534;">${requestedName}</strong> ha aceptado el intercambio. <strong>El cambio ya está aplicado</strong> en el sistema de guardias.`
    : `<strong style="color:#991B1B;">${requestedName}</strong> ha rechazado la solicitud. Tus guardias permanecen sin cambios.`

  const body = `
    <!-- Status banner -->
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin-bottom:28px;">
      <tr>
        <td style="background:${statusBg};border:1.5px solid ${statusBorder};border-radius:16px;padding:20px 22px;">
          <table role="presentation" cellpadding="0" cellspacing="0">
            <tr>
              <td style="font-size:28px;vertical-align:top;padding-right:16px;line-height:1;">${statusIcon}</td>
              <td style="vertical-align:top;">
                <p style="margin:0 0 5px;font-size:17px;font-weight:700;color:${statusColor};">${statusTitle}</p>
                <p style="margin:0;font-size:14px;color:${statusColor};line-height:1.6;opacity:0.85;">${statusDesc}</p>
              </td>
            </tr>
          </table>
        </td>
      </tr>
    </table>

    <!-- Swap summary -->
    <p style="margin:0 0 12px;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:0.07em;color:#94A3B8;">Detalle del intercambio</p>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="border:1.5px solid #E2E8F0;border-radius:16px;overflow:hidden;margin-bottom:28px;">
      <tr style="background:#F8FAFC;">
        <td width="50%" style="padding:12px 18px;border-bottom:1px solid #E2E8F0;border-right:1px solid #E2E8F0;">
          <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;">Tu guardia</p>
        </td>
        <td width="50%" style="padding:12px 18px;border-bottom:1px solid #E2E8F0;">
          <p style="margin:0;font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:#94A3B8;">Guardia de ${requestedName}</p>
        </td>
      </tr>
      <tr>
        <td style="padding:18px;border-right:1px solid #E2E8F0;vertical-align:top;">
          <p style="margin:0 0 4px;font-size:24px;font-weight:800;color:#1E293B;letter-spacing:-0.5px;">Sem. ${requesterWeek}</p>
          <p style="margin:0;font-size:13px;color:#64748B;font-weight:500;">${requesterDates}</p>
        </td>
        <td style="padding:18px;background:${accepted ? "#F0FDF4" : "#FFF1F2"};vertical-align:top;">
          <p style="margin:0 0 4px;font-size:24px;font-weight:800;color:${accepted ? "#16A34A" : "#DC2626"};letter-spacing:-0.5px;">Sem. ${requestedWeek}</p>
          <p style="margin:0;font-size:13px;color:${accepted ? "#4ADE80" : "#F87171"};font-weight:500;">${requestedDates}</p>
        </td>
      </tr>
    </table>

    <!-- CTA Button -->
    <table role="presentation" cellpadding="0" cellspacing="0">
      <tr>
        <td style="border-radius:12px;background:linear-gradient(135deg,#4F46E5,#1D4ED8);">
          <a href="${actionUrl}" style="display:inline-block;padding:15px 32px;color:#ffffff;font-size:15px;font-weight:700;text-decoration:none;letter-spacing:-0.1px;">
            Ver mi perfil &rarr;
          </a>
        </td>
      </tr>
    </table>`

  return emailLayout(header, body)
}
