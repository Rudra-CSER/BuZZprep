import type { Env } from '../config/env';

export interface MailMessage {
  to: string;
  subject: string;
  text: string;
  html?: string;
}

/** Sends email. Exists only when SMTP_URL is set. */
export interface Mailer {
  send(message: MailMessage): Promise<void>;
}

interface SmtpTransport {
  sendMail(message: MailMessage & { from: string }): Promise<unknown>;
}

/**
 * Email over SMTP, or null when SMTP_URL isn't set. Nodemailer is loaded on the first send, so a
 * server without email never loads it.
 */
export function createMailer(
  env: Pick<Env, 'SMTP_URL' | 'MAIL_FROM' | 'appOrigin'>,
): Mailer | null {
  const url = env.SMTP_URL;
  if (!url) return null;
  const from = env.MAIL_FROM ?? `buZZprep <no-reply@${new URL(env.appOrigin).hostname}>`;
  let transport: Promise<SmtpTransport> | null = null;
  return {
    async send(message) {
      transport ??= loadTransport(url).catch((err: unknown) => {
        transport = null; // try again on the next send
        throw err;
      });
      await (await transport).sendMail({ from, ...message });
    },
  };
}

async function loadTransport(url: string): Promise<SmtpTransport> {
  // A variable specifier keeps nodemailer out of type-checking and bundling: it is only needed
  // where email is turned on, and it stays an ordinary runtime dependency.
  const specifier = 'nodemailer';
  const mod = (await import(specifier)) as {
    default: { createTransport(url: string): SmtpTransport };
  };
  return mod.default.createTransport(url);
}
