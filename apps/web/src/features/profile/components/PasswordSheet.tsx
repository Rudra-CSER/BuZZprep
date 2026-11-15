import { useState, type FormEvent } from 'react';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { Button } from '@/components/ui/button';
import { Field } from '@/components/ui/field';
import { Input } from '@/components/ui/input';
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { changePassword } from '../api';

export function PasswordSheet({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) {
  const [current, setCurrent] = useState('');
  const [next, setNext] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await changePassword({ currentPassword: current, newPassword: next });
      toast.success('Password changed. Other devices were signed out.');
      onOpenChange(false);
      setCurrent('');
      setNext('');
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <SheetHeader>
            <SheetTitle>Change password</SheetTitle>
            <SheetDescription>Other signed-in devices will be signed out.</SheetDescription>
          </SheetHeader>
          <SheetBody className="grid gap-4">
            <Field label="Current password">
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  value={current}
                  onChange={(e) => setCurrent(e.target.value)}
                  required
                />
              )}
            </Field>
            <Field label="New password" hint="At least 10 characters.">
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="new-password"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                  required
                  minLength={10}
                />
              )}
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button type="submit" size="lg" className="flex-1" disabled={busy || next.length < 10}>
              {busy ? 'Changing…' : 'Change password'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
