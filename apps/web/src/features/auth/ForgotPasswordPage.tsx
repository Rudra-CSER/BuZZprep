import { MailCheck } from 'lucide-react';
import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { forgotPassword, useMe, useMeta } from './api';
import { AuthFrame } from './components/AuthFrame';

export function ForgotPasswordPage() {
  const { data: me } = useMe();
  const { data: meta, isPending } = useMeta();
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (me) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await forgotPassword({ email });
      setSentTo(email.trim());
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const footer = (
    <>
      Remembered it?{' '}
      <Link to="/login" className="font-medium text-primary">
        Sign in
      </Link>
    </>
  );

  // Servers without email: the owner makes reset links on the server.
  if (!isPending && meta?.passwordReset !== 'email') {
    return (
      <AuthFrame
        title="Forgot your password?"
        subtitle="This server doesn’t send email, so ask its owner for a reset link."
        footer={footer}
      >
        <div className="rounded-[12px] bg-muted p-4 text-[14px] leading-relaxed">
          <p>If you run this server, make a link for the account with:</p>
          <code className="mt-2 block rounded bg-background px-2 py-1.5 text-[13px]">
            <span className="whitespace-nowrap">npm run password:link --</span>{' '}
            <span className="whitespace-nowrap">--email you@example.com</span>
          </code>
          <p className="mt-2">It works once, for 60 minutes.</p>
        </div>
      </AuthFrame>
    );
  }

  if (sentTo) {
    return (
      <AuthFrame
        title="Check your email"
        subtitle="The link works once, for 60 minutes."
        footer={footer}
      >
        <div className="flex gap-3 rounded-[12px] bg-accent p-4 text-[15px] text-accent-foreground">
          <MailCheck className="mt-0.5 size-5 shrink-0" />
          <p>
            If an account uses <span className="font-medium">{sentTo}</span>, a link to choose a new
            password is on its way. Nothing there after a few minutes? Check spam, or ask again.
          </p>
        </div>
        <Button variant="tinted" onClick={() => setSentTo(null)}>
          Use a different email
        </Button>
      </AuthFrame>
    );
  }

  return (
    <AuthFrame
      title="Forgot your password?"
      subtitle="Enter your account’s email and we’ll send a link to choose a new one."
      footer={footer}
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <Field label="Email">
          {(id) => (
            <Input
              id={id}
              type="email"
              inputMode="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          )}
        </Field>
        {error ? (
          <p role="alert" className="text-[14px] text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={busy || !email.includes('@')} className="mt-1">
          {busy ? 'Sending…' : 'Send reset link'}
        </Button>
      </form>
    </AuthFrame>
  );
}
