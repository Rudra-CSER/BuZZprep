import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { errorMessage, fieldErrors } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { browserTimeZone } from '@/lib/format';
import { register, useMe, useMeta } from './api';
import { AuthFrame } from './components/AuthFrame';
import { PasswordInput } from './components/PasswordInput';
import { useAfterAuth } from './hooks/useAfterAuth';

export function RegisterPage() {
  const { data: me } = useMe();
  const { data: meta } = useMeta();
  const after = useAfterAuth();
  const [form, setForm] = useState({ displayName: '', email: '', password: '', inviteCode: '' });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const timezone = browserTimeZone();

  if (me) return <Navigate to="/" replace />;

  const set = (k: keyof typeof form) => (v: string) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setErrors({});
    try {
      await after(await register({ ...form, inviteCode: form.inviteCode || undefined, timezone }));
    } catch (err) {
      setErrors(fieldErrors(err));
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  const firstAccount = meta?.setupRequired === true;
  const closed = meta?.registrationMode === 'closed' && !firstAccount;

  return (
    <AuthFrame
      title="Create your account"
      subtitle="Your plan, schedule and journal stay private to you."
      footer={
        <>
          Already have an account?{' '}
          <Link to="/login" className="font-medium text-primary">
            Sign in
          </Link>
        </>
      }
    >
      {closed ? (
        <p className="rounded-[12px] bg-muted p-4 text-[14px]">
          Registration is closed on this server. Ask its owner for access, or self-host your own
          copy of buZZprep.
        </p>
      ) : (
        <form onSubmit={submit} className="grid gap-4" noValidate>
          {firstAccount && (
            <p className="rounded-[12px] bg-accent p-4 text-[14px] text-accent-foreground">
              This is the first account on this server, so it becomes the owner account.
            </p>
          )}
          <Field label="Your name" error={errors.displayName}>
            {(id, d) => (
              <Input
                id={id}
                autoComplete="given-name"
                value={form.displayName}
                onChange={(e) => set('displayName')(e.target.value)}
                aria-describedby={d}
                aria-invalid={!!errors.displayName}
                required
              />
            )}
          </Field>
          <Field label="Email" error={errors.email}>
            {(id, d) => (
              <Input
                id={id}
                type="email"
                inputMode="email"
                autoComplete="email"
                value={form.email}
                onChange={(e) => set('email')(e.target.value)}
                aria-describedby={d}
                aria-invalid={!!errors.email}
                required
              />
            )}
          </Field>
          <Field
            label="Password"
            hint="At least 10 characters. A short sentence works well."
            error={errors.password}
          >
            {(id, d) => (
              <PasswordInput
                id={id}
                describedBy={d}
                value={form.password}
                onChange={set('password')}
                autoComplete="new-password"
                invalid={!!errors.password}
              />
            )}
          </Field>
          {meta?.registrationMode === 'invite' && (
            <Field label="Invite code" error={errors.inviteCode}>
              {(id, d) => (
                <Input
                  id={id}
                  value={form.inviteCode}
                  onChange={(e) => set('inviteCode')(e.target.value)}
                  aria-describedby={d}
                  required
                />
              )}
            </Field>
          )}
          <p className="text-[13px] text-muted-foreground">
            Time zone: {timezone}. You can change it later.
          </p>
          {error && Object.keys(errors).length === 0 ? (
            <p role="alert" className="text-[14px] text-destructive">
              {error}
            </p>
          ) : null}
          <Button type="submit" size="lg" disabled={busy} className="mt-1">
            {busy ? 'Creating account…' : 'Create account'}
          </Button>
        </form>
      )}
    </AuthFrame>
  );
}
