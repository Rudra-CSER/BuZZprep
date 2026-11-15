import { KeyRound, LogOut, Trash2 } from 'lucide-react';
import { ListSection } from '@/components/ui/list-section';

/** Password, sign out and account deletion. */
export function AccountSection({
  onChangePassword,
  onSignOut,
  onDelete,
}: {
  onChangePassword: () => void;
  onSignOut: () => void;
  onDelete: () => void;
}) {
  return (
    <ListSection title="Account">
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] hover:bg-muted/50"
        onClick={onChangePassword}
      >
        <KeyRound className="size-[18px] text-muted-foreground" /> Change password
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] hover:bg-muted/50"
        onClick={onSignOut}
      >
        <LogOut className="size-[18px] text-muted-foreground" /> Sign out
      </button>
      <button
        type="button"
        className="flex w-full items-center gap-3 px-4 py-3.5 text-left text-[15px] text-destructive hover:bg-muted/50"
        onClick={onDelete}
      >
        <Trash2 className="size-[18px]" /> Delete account
      </button>
    </ListSection>
  );
}
