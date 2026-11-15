import { Download, Lock, Server } from 'lucide-react';
import { type ReactNode, useRef, useState } from 'react';
import { Link, Navigate } from 'react-router';
import { Logo } from '@/components/Logo';
import { StatusBarBackdrop } from '@/components/StatusBarBackdrop';
import { Wordmark } from '@/components/Wordmark';
import { Button } from '@/components/ui/button';
import { useMe, useMeta } from '@/features/auth/api';
import { cn } from '@/lib/utils';
import { HomePreview, NightPreview } from './components/AppPreviews';
import { IntroSplash } from './components/IntroSplash';
import { PhoneFrame } from './components/PhoneFrame';
import {
  JournalVignette,
  PlanVignette,
  ReminderVignette,
  RoutineVignette,
} from './components/Vignettes';
import { introWanted } from './motion/intro';
import { useWelcomeMotion } from './motion/useWelcomeMotion';

type Signup = 'open' | 'invite' | 'closed';

/** Content width with room for the notch and rounded corners of a phone held sideways. */
const WRAP =
  'mx-auto w-full max-w-6xl pl-[max(1.25rem,var(--safe-left))] pr-[max(1.25rem,var(--safe-right))] sm:pl-[max(1.5rem,var(--safe-left))] sm:pr-[max(1.5rem,var(--safe-right))]';

const GOLD = 'bg-gold text-chrome hover:bg-gold/90';

/**
 * What a visitor without an account sees first: what buZZprep does, shown with pictures of the
 * app, and the way in. It works without the server (the sign-up note adapts once /meta answers),
 * so it still shows if the API is down or not deployed yet.
 *
 * Motion (./motion): a short opening on the first visit in a tab, then the pictures of the app act
 * out what they show as they scroll into view. The words never move. With reduced motion asked
 * for, the page is still and every picture shows its final state.
 */
export function WelcomePage() {
  const { data: me } = useMe();
  const { data: meta } = useMeta();
  const root = useRef<HTMLDivElement>(null);
  const [intro] = useState(introWanted);
  useWelcomeMotion(root, intro);
  if (me) return <Navigate to="/" replace />;

  const signup: Signup = meta?.setupRequired ? 'open' : (meta?.registrationMode ?? 'open');

  return (
    <div ref={root} className="min-h-dvh bg-background">
      {intro ? <IntroSplash /> : null}
      <StatusBarBackdrop />
      <Header signup={signup} />
      <main>
        <Hero signup={signup} />
        <section aria-labelledby="features-heading">
          <h2 id="features-heading" className="sr-only">
            What buZZprep does
          </h2>
          <div className={cn(WRAP, 'grid gap-16 py-16 lg:gap-24 lg:py-24')}>
            <Feature
              title="A routine that fits your day"
              body="Tell it when you work, when you sleep now and when you’d like to. It puts study sessions in the time that’s left, moves your bedtime earlier a little at a time, and when a session is missed it asks what to do instead of quietly dropping it."
              visual={<RoutineVignette />}
            />
            <Feature
              flip
              title="Reminders that don’t need the app open"
              body="The server sends reminders as notifications, so they reach you when the app is closed. On iPhone and iPad, add buZZprep to your Home Screen first. Quiet hours keep your nights quiet."
              visual={<ReminderVignette />}
            />
          </div>
          <NightBand />
          <div className={cn(WRAP, 'py-16 lg:py-24')}>
            <Feature
              flip
              title="Your plan, counted down"
              body="Set a target date and the milestones on the way. Every day shows where you are in the plan, what comes next and what still needs a decision."
              visual={<PlanVignette />}
            />
          </div>
        </section>
        <Privacy />
        <Steps signup={signup} />
        <section aria-labelledby="start-heading" className="chrome relative overflow-hidden">
          {/* A new day coming up behind the last call to action. */}
          <div
            data-anim="sunrise"
            aria-hidden
            className="pointer-events-none absolute bottom-[-340px] left-1/2 -ml-[480px] h-[640px] w-[960px] rounded-full bg-[radial-gradient(closest-side,oklch(0.82_0.11_76/0.26),transparent)]"
          />
          <div className={cn(WRAP, 'relative py-16 lg:py-20')}>
            <h2
              id="start-heading"
              className="text-[32px] font-semibold leading-tight tracking-[-0.015em] sm:text-[40px]"
            >
              Start with today.
            </h2>
            <p className="mt-3 max-w-xl text-[18px] leading-relaxed text-chrome-muted">
              Your first day is ready as soon as setup ends. Tonight, try the journal.
            </p>
            <Ctas signup={signup} className="mt-8" />
          </div>
        </section>
      </main>
      <footer className="safe-bottom">
        <div
          className={cn(
            WRAP,
            'flex flex-col gap-3 py-8 text-[14px] text-muted-foreground sm:flex-row sm:items-center sm:justify-between',
          )}
        >
          <p className="flex items-center gap-2">
            <Logo decorative className="size-5 rounded-[6px]" />
            buZZprep{meta?.version ? ` ${meta.version}` : ''}. Open source, MIT licence.
          </p>
          <Link to="/login" className="font-medium text-primary">
            Sign in
          </Link>
        </div>
      </footer>
    </div>
  );
}

function Header({ signup }: { signup: Signup }) {
  return (
    <header className="chrome sticky top-0 z-30 pt-[var(--safe-top)]">
      <div className={cn(WRAP, 'flex h-[60px] items-center gap-3')}>
        <Link
          to="/welcome"
          data-anim="header-brand"
          className="flex items-center gap-2.5 rounded-[10px]"
        >
          <Logo decorative className="size-7 rounded-[8px]" />
          <span data-anim="header-mark" className="inline-flex">
            <Wordmark className="text-[19px] leading-none" />
          </span>
        </Link>
        <nav
          aria-label="Account"
          data-anim="header-nav"
          className="ml-auto flex items-center gap-1.5"
        >
          <Button
            asChild
            variant="ghost"
            size="sm"
            className="text-chrome-foreground hover:bg-white/10"
          >
            <Link to="/login">Sign in</Link>
          </Button>
          {signup !== 'closed' ? (
            <Button asChild size="sm" className={cn(GOLD, 'hidden sm:inline-flex')}>
              <Link to="/register">Create account</Link>
            </Button>
          ) : null}
        </nav>
      </div>
    </header>
  );
}

const SIGNUP_NOTE: Record<Signup, string> = {
  open: 'Open source. What you write stays private to you.',
  invite: 'New accounts on this server need an invite code from its owner.',
  closed: 'New accounts are closed on this server. Ask its owner for access.',
};

function Ctas({ signup, className }: { signup: Signup; className?: string }) {
  return (
    <div className={className}>
      <div className="flex flex-col gap-3 sm:flex-row">
        {signup !== 'closed' ? (
          <Button asChild size="lg" className={GOLD}>
            <Link to="/register">Create an account</Link>
          </Button>
        ) : null}
        <Button
          asChild
          size="lg"
          variant="ghost"
          className={
            signup === 'closed'
              ? GOLD
              : 'text-chrome-foreground ring-1 ring-inset ring-white/25 hover:bg-white/10'
          }
        >
          <Link to="/login">Sign in</Link>
        </Button>
      </div>
      <p className="mt-4 text-[14px] text-chrome-muted">{SIGNUP_NOTE[signup]}</p>
    </div>
  );
}

function Hero({ signup }: { signup: Signup }) {
  return (
    // Only the words take the ink's tokens; the phone previews keep the app's own.
    <section className="overflow-hidden bg-chrome">
      <div
        className={cn(
          WRAP,
          'grid items-center gap-12 pt-10 sm:pt-14 lg:grid-cols-[minmax(0,1fr)_520px] lg:gap-10 lg:pb-16 lg:pt-16',
        )}
      >
        <div className="chrome max-w-xl">
          <h1
            data-anim="hero-title"
            className="text-[36px] font-bold leading-[1.12] sm:text-[48px] lg:text-[54px]"
          >
            Interview prep, planned around your real day.
          </h1>
          <p
            data-anim="hero-text"
            className="mt-5 text-[18px] leading-relaxed text-chrome-muted sm:text-[19px]"
          >
            buZZprep builds a study routine around your work and your sleep, reminds you when a
            session starts, and closes each night with a five-minute journal that becomes tomorrow’s
            revision notes.
          </p>
          <div data-anim="hero-ctas" className="mt-8">
            <Ctas signup={signup} />
          </div>
        </div>

        {/* Phones rise from the bottom edge on small screens; side by side on wide ones. */}
        <div className="relative mx-auto h-[430px] w-full max-w-[340px] sm:h-[500px] lg:h-[650px] lg:max-w-none">
          <div
            data-anim="hero-glow"
            aria-hidden
            className="pointer-events-none absolute left-1/2 top-[42%] -ml-[300px] -mt-[300px] size-[600px] rounded-full bg-[radial-gradient(closest-side,oklch(0.82_0.11_76/0.16),transparent)]"
          />
          <PhoneFrame
            anim="phone-night"
            label="Preview of the night journal, ready to record a spoken walk-through of the day"
            className="absolute right-0 top-12 hidden [--s:0.74] lg:block"
          >
            <NightPreview />
          </PhoneFrame>
          <PhoneFrame
            anim="phone-home"
            label="Preview of the Home screen: your plan, the next session and today’s list"
            className="absolute inset-x-0 top-0 mx-auto w-fit [--s:0.76] sm:[--s:0.82] lg:right-auto lg:mx-0 lg:[--s:0.8]"
          >
            <HomePreview />
          </PhoneFrame>
        </div>
      </div>
    </section>
  );
}

function Feature({
  title,
  body,
  visual,
  flip,
}: {
  title: string;
  body: string;
  visual: ReactNode;
  flip?: boolean;
}) {
  return (
    <div className="grid items-center gap-8 lg:grid-cols-2 lg:gap-16">
      <div className={cn('max-w-lg', flip && 'lg:order-2')}>
        <h3 className="text-[28px] font-semibold leading-tight tracking-[-0.01em] sm:text-[34px]">
          {title}
        </h3>
        <p className="mt-4 text-[17px] leading-relaxed text-muted-foreground sm:text-[18px]">
          {body}
        </p>
      </div>
      <div className={cn('w-full max-w-[520px]', flip ? 'lg:order-1' : 'lg:justify-self-end')}>
        {visual}
      </div>
    </div>
  );
}

/** Fixed, scattered stars for the night band (same every render). */
const STARS = Array.from({ length: 28 }, (_, i) => {
  const rand = (n: number) => {
    const x = Math.sin(i * 12.9898 + n * 78.233) * 43758.5453;
    return x - Math.floor(x);
  };
  return {
    left: rand(1) * 100,
    top: 4 + rand(2) * 50,
    opacity: 0.25 + rand(3) * 0.55,
    big: rand(4) > 0.82,
  };
});

/** The journal's section: the page turns to night, like the app does before bed. */
function NightBand() {
  return (
    <>
      <div
        aria-hidden
        className="h-24 bg-[linear-gradient(to_bottom,var(--background),var(--night))] sm:h-32"
      />
      <div data-anim="night-band" className="night relative overflow-hidden">
        <div aria-hidden className="pointer-events-none absolute inset-0">
          {STARS.map((s, i) => (
            <span
              key={i}
              data-anim="star"
              data-o={s.opacity}
              style={{ left: `${s.left}%`, top: `${s.top}%`, opacity: s.opacity }}
              className={cn(
                'absolute rounded-full bg-night-text',
                s.big ? 'size-[3px]' : 'size-[2px]',
              )}
            />
          ))}
        </div>
        <div className={cn(WRAP, 'relative py-16 lg:py-24')}>
          <Feature
            title="Five minutes before bed"
            body="Just before your bedtime, a night journal opens. Talk through what you studied, or type it. When the server has AI turned on, your words become short revision notes, and at the weekend the week’s notes add up to one revision sheet."
            visual={<JournalVignette />}
          />
        </div>
      </div>
      <div
        aria-hidden
        className="h-24 bg-[linear-gradient(to_bottom,var(--night),var(--background))] sm:h-32"
      />
    </>
  );
}

function Privacy() {
  const items = [
    { icon: Lock, text: 'Only you can see your schedule, your notes and your journal.' },
    { icon: Download, text: 'Export everything as a file, or delete your account and its data.' },
    { icon: Server, text: 'Open source under the MIT licence, so you can run your own copy.' },
  ];
  return (
    <section aria-labelledby="privacy-heading" className="border-y bg-card">
      <div className={cn(WRAP, 'py-14')}>
        <h2
          id="privacy-heading"
          className="text-[28px] font-semibold tracking-[-0.01em] sm:text-[34px]"
        >
          Private by default
        </h2>
        <ul className="mt-8 grid gap-6 sm:grid-cols-3">
          {items.map(({ icon: Icon, text }) => (
            <li key={text} className="flex gap-3 text-[17px] leading-snug">
              <Icon className="mt-0.5 size-5 shrink-0 text-primary" />
              {text}
            </li>
          ))}
        </ul>
      </div>
    </section>
  );
}

function Steps({ signup }: { signup: Signup }) {
  const first: Record<Signup, string> = {
    open: 'An email address and a password.',
    invite: 'An email address, a password and the invite code you were given.',
    closed: 'Accounts on this server come from its owner.',
  };
  const steps = [
    { title: signup === 'closed' ? 'Get an account' : 'Create an account', body: first[signup] },
    {
      title: 'Answer a few questions',
      body: 'What you’re preparing for, when you work and when you sleep.',
    },
    {
      title: 'Start today',
      body: 'Your routine, reminders and journal are ready. Change anything later.',
    },
  ];
  return (
    <section aria-labelledby="steps-heading" className={cn(WRAP, 'py-16 lg:py-20')}>
      <h2
        id="steps-heading"
        className="text-[28px] font-semibold tracking-[-0.01em] sm:text-[34px]"
      >
        How it starts
      </h2>
      <ol data-anim="steps" className="mt-8 grid gap-8 sm:grid-cols-3 sm:gap-6">
        {steps.map((s, i) => (
          <li
            key={s.title}
            className="relative grid grid-cols-[2.25rem_minmax(0,1fr)] grid-rows-[2.25rem_auto] content-start gap-x-4 gap-y-0.5 sm:grid-cols-1 sm:grid-rows-none sm:gap-2"
          >
            {i < steps.length - 1 ? (
              // The path to the next step: down when the steps stack, across in columns.
              <span
                aria-hidden
                className="absolute bg-border max-sm:left-[17px] max-sm:top-[42px] max-sm:h-[calc(100%+2rem-48px)] max-sm:w-[2px] sm:left-[46px] sm:top-[17px] sm:h-[2px] sm:w-[calc(100%+1.5rem-56px)]"
              >
                <span data-anim="step-line" className="block size-full bg-primary" />
              </span>
            ) : null}
            <span
              aria-hidden
              className="relative grid size-9 place-items-center rounded-full bg-primary/10 text-[17px] font-semibold text-primary"
            >
              {i + 1}
              <span
                data-anim="step-fill"
                className="absolute inset-0 grid place-items-center rounded-full bg-primary text-primary-foreground"
              >
                {i + 1}
              </span>
            </span>
            <span className="self-center text-[18px] font-semibold sm:self-auto">{s.title}</span>
            <span className="col-start-2 text-[16px] leading-relaxed text-muted-foreground sm:col-start-auto">
              {s.body}
            </span>
          </li>
        ))}
      </ol>
    </section>
  );
}
