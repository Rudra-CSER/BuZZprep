import { defaultAnswers, logicalDateOf } from '@buzzprep/shared';
import { useQueryClient } from '@tanstack/react-query';
import { ChevronLeft } from 'lucide-react';
import { useState } from 'react';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';
import { errorMessage } from '@/api/client';
import { Logo } from '@/components/Logo';
import { StatusBarBackdrop } from '@/components/StatusBarBackdrop';
import { Button } from '@/components/ui/button';
import { ProgressBar } from '@/components/ui/progress-bar';
import { browserTimeZone } from '@/lib/format';
import { completeOnboarding, useSavedAnswers } from './api';
import { STEPS } from './steps';
import type { Answers, Update } from './types';

export function OnboardingPage() {
  const qc = useQueryClient();
  const navigate = useNavigate();
  const [answers, setAnswers] = useState<Answers>(() => {
    const tz = browserTimeZone();
    const today = logicalDateOf(Date.now(), { zone: tz, dayBoundaryMinutes: 240 });
    return defaultAnswers('sde_interview', { timezone: tz, today });
  });
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const saved = useSavedAnswers();
  const [restored, setRestored] = useState(false);
  if (!restored && saved.data) {
    setRestored(true);
    if (saved.data.answers) setAnswers(saved.data.answers);
  }

  const update: Update = (patch) => setAnswers((a) => ({ ...a, ...patch }));
  const current = STEPS[step]!;
  const last = step === STEPS.length - 1;
  const blocker = current.blocker?.(answers) ?? null;

  const finish = async () => {
    setBusy(true);
    try {
      await completeOnboarding(answers);
      await qc.invalidateQueries();
      toast.success('Your plan is ready');
      navigate('/', { replace: true });
    } catch (err) {
      toast.error(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex min-h-dvh flex-col safe-top">
      <StatusBarBackdrop />
      <header className="mx-auto grid w-full max-w-xl gap-3 px-5 pt-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Logo className="size-7 rounded-[8px]" />
            <span className="text-[15px] font-semibold">Set up buZZprep</span>
          </div>
          <span className="text-[13px] text-muted-foreground tabular">
            Step {step + 1} of {STEPS.length}
          </span>
        </div>
        <ProgressBar
          value={((step + 1) / STEPS.length) * 100}
          label="Setup progress"
          className="h-1"
        />
      </header>

      <main className="mx-auto w-full max-w-xl flex-1 px-5 pb-8 pt-7">
        <h1 className="text-[26px] font-semibold leading-tight tracking-[-0.02em]">
          {current.title}
        </h1>
        <p className="mt-1.5 text-[15px] text-muted-foreground">{current.description}</p>
        <div className="mt-7 grid gap-6">{current.render(answers, update)}</div>
      </main>

      <footer className="sticky bottom-0 border-t bg-background/92 backdrop-blur-xl safe-bottom">
        <div className="mx-auto flex w-full max-w-xl items-center gap-2 px-5 py-3">
          {step > 0 && (
            <Button variant="ghost" size="lg" onClick={() => setStep((s) => s - 1)}>
              <ChevronLeft /> Back
            </Button>
          )}
          <div className="flex-1 text-right text-[13px] text-destructive">{blocker}</div>
          {last ? (
            <Button size="lg" onClick={() => void finish()} disabled={busy || !!blocker}>
              {busy ? 'Creating your plan…' : 'Create my plan'}
            </Button>
          ) : (
            <Button size="lg" onClick={() => setStep((s) => s + 1)} disabled={!!blocker}>
              Continue
            </Button>
          )}
        </div>
      </footer>
    </div>
  );
}
