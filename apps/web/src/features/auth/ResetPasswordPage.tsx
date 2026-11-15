import { useState, type FormEvent } from 'react';
import { Link, useLocation } from 'react-router';
import { toast } from 'sonner';
import { ApiError, errorMessage, fieldErrors } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { resetPassword } from './api';
import { AuthFrame } from './components/AuthFrame';
import { PasswordInput } from './components/PasswordInput';
import { useAfterAuth } from './hooks/useAfterAuth';

/** The token arrives in the link's fragment (#token=…), which is never sent to a server. */
function tokenFrom(hash: string): string | null {
  return new URLSearchParams(hash.replace(/^#/, '')).get('token');
}

export function ResetPasswordPage() {
  const location = useLocation();
  const after = useAfterAuth();
  const [token] = useState(() => tokenFrom(location.hash));
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [expired, setExpired] = useState(false);
  const [busy, setBusy] = useState(false);

  const footer = (
    <>
      <Link to="/forgot-password" className="font-medium text-primary">
        Ask for a new link
      </Link>{' '}
      or{' '}
      <Link to="/login" className="font-medium text-primary">
        sign in
      </Link>
    </>
  );

  if (!token || expired) {
    return (
      <AuthFrame
        title={expired ? 'This link has expired' : 'This link is incomplete'}
        subtitle={
          expired
            ? 'Reset links work once, for 60 minutes. Ask for a new one.'
            : 'Open the reset link from your email again, or ask for a new one.'
        }
        footer={
          <>
            Remembered it?{' '}
            <Link to="/login" className="font-medium text-primary">
              Sign in
            </Link>
          </>
        }
      >
        <Button asChild size="lg">
          <Link to="/forgot-password">Ask for a new link</Link>
        </Button>
      </AuthFrame>
    );
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const result = await resetPassword({ token, password });
      toast.success('Password changed. You’re signed in.');
      await after(result);
    } catch (err) {
      if (err instanceof ApiError && err.status === 410) setExpired(true);
      else setError(fieldErrors(err).password ?? errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame
      title="Choose a new password"
      subtitle="You’ll be signed in, and signed out on every other device."
      footer={footer}
    >
      <form onSubmit={submit} className="grid gap-4" noValidate>
        <Field label="New password" hint="At least 10 characters." error={error ?? undefined}>
          {(id, describedBy) => (
            <PasswordInput
              id={id}
              describedBy={describedBy}
              value={password}
              onChange={setPassword}
              autoComplete="new-password"
              invalid={!!error}
            />
          )}
        </Field>
        <Button type="submit" size="lg" disabled={busy || password.length < 10} className="mt-1">
          {busy ? 'Saving…' : 'Save new password'}
        </Button>
      </form>
    </AuthFrame>
  );
}
