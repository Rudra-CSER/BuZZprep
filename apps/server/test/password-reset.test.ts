import { describe, expect, it } from 'vitest';
import { createMailer } from '../src/lib/mailer';
import { resetEmail, resetLinkUrl } from '../src/modules/auth/password-reset.service';
import { testEnv } from './helpers';

describe('password reset links', () => {
  it('carries the token in the fragment, which browsers never send to a server', () => {
    const link = new URL(resetLinkUrl(testEnv(), 'abc123'));
    expect(link.origin).toBe('http://localhost:5173');
    expect(link.pathname).toBe('/reset-password');
    expect(link.search).toBe('');
    expect(link.hash).toBe('#token=abc123');
  });

  it('writes an email with the link, the time limit and a safe name', () => {
    const mail = resetEmail('<Ada>', 'https://prep.example.com/reset-password#token=t');
    expect(mail.subject).toBe('Reset your buZZprep password');
    expect(mail.text).toContain('https://prep.example.com/reset-password#token=t');
    expect(mail.text).toContain('60 minutes');
    expect(mail.html).toContain('&lt;Ada&gt;');
    expect(mail.html).not.toContain('<Ada>');
  });
});

describe('email settings', () => {
  it('sends no email unless SMTP_URL is set', () => {
    expect(createMailer(testEnv())).toBeNull();
    expect(createMailer(testEnv({ SMTP_URL: 'smtps://u:p@smtp.example.com:465' }))).not.toBeNull();
  });

  it('only accepts smtp:// and smtps:// addresses', () => {
    expect(() => testEnv({ SMTP_URL: 'https://smtp.example.com' })).toThrow(/SMTP_URL/);
  });
});
