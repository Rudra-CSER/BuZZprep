import { useState } from 'react';
import { Page } from '@/components/Page';
import { useMe, useMeta } from '@/features/auth/api';
import { useSignOut } from '@/features/auth/hooks/useSignOut';
import { usePushDevices } from '@/features/notifications/api';
import { useActivePlan, useProfile } from './api';
import { AboutYouSection } from './components/AboutYouSection';
import { AccountSection } from './components/AccountSection';
import { AppearanceSection } from './components/AppearanceSection';
import { DataSection } from './components/DataSection';
import { DeleteAccountSheet } from './components/DeleteAccountSheet';
import { PasswordSheet } from './components/PasswordSheet';
import { ProfileLinks } from './components/ProfileLinks';
import { TimeSection } from './components/TimeSection';

export function ProfilePage() {
  const { data: me } = useMe();
  const { data: profileData } = useProfile();
  const { data: plan } = useActivePlan();
  const { data: devices } = usePushDevices();
  const { data: meta } = useMeta();
  const [passwordOpen, setPasswordOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const profile = profileData?.profile;

  const signOut = useSignOut();

  return (
    <Page title="Profile" subtitle={me?.user.email}>
      <div className="grid gap-7">
        <ProfileLinks plan={plan?.plan} devices={devices?.subscriptions} />
        <AppearanceSection />
        {profile && <AboutYouSection profile={profile} />}
        {profile && <TimeSection profile={profile} />}
        <DataSection />
        <AccountSection
          onChangePassword={() => setPasswordOpen(true)}
          onSignOut={() => void signOut()}
          onDelete={() => setDeleteOpen(true)}
        />

        <p className="pb-4 text-center text-[13px] text-muted-foreground">
          buZZprep {meta?.version ?? ''} — open source, MIT licensed
        </p>
      </div>

      <PasswordSheet open={passwordOpen} onOpenChange={setPasswordOpen} />
      <DeleteAccountSheet
        open={deleteOpen}
        onOpenChange={setDeleteOpen}
        onDeleted={() => void signOut()}
      />
    </Page>
  );
}
