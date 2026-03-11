// src/lib/notifications/sender.ts
// TODO: Implementar con Resend, SendGrid o Supabase Edge Functions cuando se configure un servicio.

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  console.log(`[EMAIL PENDIENTE] To: ${to} | Subject: ${subject}`);
  console.log(`[EMAIL BODY]\n${body}`);
  // Cuando se configure un servicio de email, descomentar e implementar:
  // const resend = new Resend(process.env.RESEND_API_KEY);
  // await resend.emails.send({
  //   from: 'guardias@juzgado-tarazona.es',
  //   to,
  //   subject,
  //   text: body,
  // });
}
