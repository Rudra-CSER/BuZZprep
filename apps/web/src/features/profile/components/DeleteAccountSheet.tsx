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
import { deleteAccount } from '../api';

export function DeleteAccountSheet({
  open,
  onOpenChange,
  onDeleted,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onDeleted: () => void;
}) {
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const submit = async (e: FormEvent) => {
    e.preventDefault();
    setBusy(true);
    try {
      await deleteAccount({ password, confirm });
      toast('Your account and all its data were deleted.');
      onDeleted();
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
            <SheetTitle>Delete your account?</SheetTitle>
            <SheetDescription>
              This permanently deletes your plan, schedule, journal, progress and devices from this
              server. Download your data first if you want a copy.
            </SheetDescription>
          </SheetHeader>
          <SheetBody className="grid gap-4">
            <Field label="Password">
              {(id) => (
                <Input
                  id={id}
                  type="password"
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              )}
            </Field>
            <Field label="Type DELETE to confirm">
              {(id) => (
                <Input
                  id={id}
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  autoCapitalize="characters"
                  required
                />
              )}
            </Field>
          </SheetBody>
          <SheetFooter>
            <Button
              type="submit"
              variant="destructive"
              size="lg"
              className="flex-1"
              disabled={busy || confirm !== 'DELETE' || !password}
            >
              {busy ? 'Deleting…' : 'Delete everything'}
            </Button>
          </SheetFooter>
        </form>
      </SheetContent>
    </Sheet>
  );
}
