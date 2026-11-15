import { useState, type FormEvent } from 'react';
import { Link, Navigate } from 'react-router';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import { login, useMe } from './api';
import { AuthFrame } from './components/AuthFrame';
import { PasswordInput } from './components/PasswordInput';
import { useAfterAuth } from './hooks/useAfterAuth';

export function LoginPage() {
  const { data: me } = useMe();
  const after = useAfterAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  if (me) return <Navigate to="/" replace />;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      await after(await login({ email, password }));
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <AuthFrame
      title="Welcome back"
      subtitle="Sign in to pick up today’s plan."
      footer={
        <>
          New here?{' '}
          <Link to="/register" className="font-medium text-primary">
            Create an account
          </Link>
        </>
      }
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
        <Field label="Password">
          {(id, describedBy) => (
            <PasswordInput
              id={id}
              describedBy={describedBy}
              value={password}
              onChange={setPassword}
              autoComplete="current-password"
            />
          )}
        </Field>
        {error ? (
          <p role="alert" className="text-[14px] text-destructive">
            {error}
          </p>
        ) : null}
        <Button type="submit" size="lg" disabled={busy || !email || !password} className="mt-1">
          {busy ? 'Signing in…' : 'Sign in'}
        </Button>
      </form>
    </AuthFrame>
  );
}
