import type { RefObject } from 'react';
import {
  BEDTIME_FIRST,
  BEDTIME_LAST,
  BEDTIME_STEP_MINUTES,
  clockLabel,
  clockOf,
  dayPos,
  HOME_NOW,
  LOCK_SPAN_MINUTES,
  LOCK_START_MINUTES,
  minutesOf,
  PLAN_DAY,
  PLAN_DAYS,
  PLAN_RING_RADIUS,
} from '../sample-day';
import { gsap, ScrollTrigger, SplitText, useGSAP } from './gsap';
import { markIntroSeen } from './intro';

/*
 * The welcome page's motion. The markup is written in its final state; everything here animates
 * towards it, so with reduced motion (or if anything here fails) the page simply shows that state.
 *
 * - Opening (first visit in a tab): two drowsy Zs drift up, buzz like a reminder, the name forms
 *   around them and flies into the header while the hero comes in.
 * - Hero: the headline rises line by line, the phones arrive, the Home preview fills in its day
 *   and a reminder drops in.
 * - Sections: each picture acts out what it shows as it scrolls into view. The words stay still.
 */

const MOTION = '(prefers-reduced-motion: no-preference)';
const WIDE = '(min-width: 640px)';

type Scope = HTMLElement;
const all = <T extends Element = HTMLElement>(scope: ParentNode, sel: string) =>
  Array.from(scope.querySelectorAll<T>(sel));
const one = <T extends Element = HTMLElement>(scope: ParentNode, sel: string) =>
  scope.querySelector<T>(sel);

/** Fonts change line breaks and sizes, so measure after they arrive (or after a short wait). */
function fontsSettled(): Promise<unknown> {
  const ready = document.fonts?.ready ?? Promise.resolve();
  return Promise.race([ready, new Promise((resolve) => setTimeout(resolve, 1200))]);
}

export function useWelcomeMotion(root: RefObject<HTMLDivElement | null>, intro: boolean) {
  useGSAP(
    () => {
      const page = root.current;
      if (!page) return;
      const mm = gsap.matchMedia();

      mm.add(MOTION, (ctx) => {
        let live = true;
        let stopSkip = () => {};
        holdHero(page, intro);
        void fontsSettled().then(() => {
          if (!live) return;
          ctx.add(() => {
            // Motion is decoration: if any of it fails, the page stays as written.
            try {
              stopSkip = playHero(page, intro);
            } catch {
              showEverything(page);
            }
            try {
              animateSections(page);
            } catch {
              // The pictures keep their final state.
            }
            ScrollTrigger.refresh();
          });
        });
        return () => {
          live = false;
          stopSkip();
        };
      });

      // The steps' path runs down when they stack and across in columns.
      mm.add({ motion: MOTION, wide: WIDE }, (ctx) => {
        if (!ctx.conditions?.motion) return;
        animateSteps(page, Boolean(ctx.conditions.wide));
      });
    },
    { scope: root },
  );
}

/** Before the first paint: hide what the hero brings in, so nothing flashes in its final place. */
function holdHero(page: Scope, intro: boolean) {
  gsap.set(all(page, '[data-anim=hero-title]'), { autoAlpha: 0 });
  gsap.set(all(page, '[data-anim=hero-text], [data-anim=hero-ctas]'), { autoAlpha: 0, y: 16 });
  gsap.set(all(page, '[data-anim=hero-glow]'), { autoAlpha: 0, scale: 0.6 });
  gsap.set(all(page, '[data-anim=phone-home]'), { autoAlpha: 0, y: 90, rotation: 4 });
  gsap.set(all(page, '[data-anim=phone-night]'), { autoAlpha: 0, x: 80, y: 30, rotation: 8 });
  gsap.set(all(page, '[data-anim=home-block], [data-anim=home-progress]'), {
    scaleX: 0,
    transformOrigin: 'left center',
  });
  gsap.set(all(page, '[data-anim=home-now]'), { left: '0%' });
  if (intro) {
    gsap.set(all(page, '[data-anim=header-brand], [data-anim=header-nav]'), { autoAlpha: 0 });
    gsap.set(
      all(
        page,
        '[data-anim=intro-z], [data-anim=intro-bu], [data-anim=intro-prep], [data-anim=intro-arc]',
      ),
      { autoAlpha: 0 },
    );
  }
}

/** If something goes wrong, take the cover away and show the page as written. */
function showEverything(page: Scope) {
  gsap.set(all(page, '[data-anim=intro]'), { autoAlpha: 0, display: 'none' });
  gsap.set(
    all(
      page,
      '[data-anim=header-brand], [data-anim=header-nav], [data-anim=hero-title], [data-anim=hero-text], [data-anim=hero-ctas], [data-anim=hero-glow], [data-anim=phone-home], [data-anim=phone-night]',
    ),
    { autoAlpha: 1, x: 0, y: 0, rotation: 0, scale: 1 },
  );
  gsap.set(all(page, '[data-anim=home-block], [data-anim=home-progress]'), { scaleX: 1 });
  gsap.set(all(page, '[data-anim=home-now]'), { left: `${dayPos(HOME_NOW)}%` });
  markIntroSeen();
}

/** The opening (when wanted) and the hero. Returns a function that removes the skip listeners. */
function playHero(page: Scope, intro: boolean): () => void {
  const master = gsap.timeline({ defaults: { ease: 'power3.out' } });
  let stopSkip = () => {};
  if (intro) stopSkip = addIntro(master, page);
  else master.addLabel('hero', 0);

  const title = one(page, '[data-anim=hero-title]');
  if (title) {
    const split = SplitText.create(title, { type: 'lines', mask: 'lines' });
    gsap.set(title, { autoAlpha: 1 });
    gsap.set(split.lines, { yPercent: 108 });
    master.to(
      split.lines,
      {
        yPercent: 0,
        duration: 1,
        ease: 'power4.out',
        stagger: 0.1,
        // Back to plain text, so the headline reflows normally when the window changes size.
        onComplete: () => split.revert(),
      },
      'hero',
    );
  }

  const home = one(page, '[data-anim=phone-home]');
  const banner = one(page, '[data-anim=home-banner]');
  master
    .to(all(page, '[data-anim=hero-text]'), { autoAlpha: 1, y: 0, duration: 0.8 }, 'hero+=0.3')
    .to(all(page, '[data-anim=hero-ctas]'), { autoAlpha: 1, y: 0, duration: 0.8 }, 'hero+=0.42')
    .to(
      all(page, '[data-anim=hero-glow]'),
      { autoAlpha: 1, scale: 1, duration: 1.8, ease: 'power2.out' },
      'hero+=0.1',
    )
    .to(home, { autoAlpha: 1, y: 0, rotation: 0, duration: 1.15 }, 'hero+=0.18')
    .to(
      all(page, '[data-anim=phone-night]'),
      { autoAlpha: 1, x: 0, y: 0, rotation: 0, duration: 1.15 },
      'hero+=0.4',
    )
    // The Home preview fills in its day: blocks, the plan bar, and "now" moving to 6:50 PM.
    .addLabel('alive', 'hero+=0.9')
    .to(
      all(page, '[data-anim=home-block]'),
      { scaleX: 1, duration: 0.5, stagger: 0.07, ease: 'power2.out' },
      'alive',
    )
    .to(
      all(page, '[data-anim=home-progress]'),
      { scaleX: 1, duration: 0.9, ease: 'power2.out' },
      'alive+=0.1',
    )
    .to(
      all(page, '[data-anim=home-now]'),
      { left: `${dayPos(HOME_NOW)}%`, duration: 1.2, ease: 'power2.inOut' },
      'alive+=0.15',
    );

  if (home && banner) {
    // Ten minutes before DSA practice: the reminder drops in and the phone buzzes.
    master
      .addLabel('reminder', 'alive+=1.5')
      .fromTo(
        banner,
        { autoAlpha: 0, yPercent: -150 },
        { autoAlpha: 1, yPercent: 0, duration: 0.6, ease: 'back.out(1.5)' },
        'reminder',
      )
      .to(
        home,
        {
          keyframes: { x: [0, -4, 4, -3, 3, -1, 0], rotation: [0, -0.8, 0.8, -0.5, 0.5, 0, 0] },
          duration: 0.42,
          ease: 'none',
        },
        'reminder+=0.08',
      )
      .to(
        banner,
        { autoAlpha: 0, yPercent: -150, duration: 0.5, ease: 'power2.in' },
        'reminder+=3.6',
      );
  }
  return stopSkip;
}

/** The opening. Adds its steps to the master timeline, ending with a "hero" label. */
function addIntro(master: gsap.core.Timeline, page: Scope): () => void {
  const cover = one(page, '[data-anim=intro]');
  const backdrop = one(page, '[data-anim=intro-bg]');
  const mark = one(page, '[data-anim=intro-mark]');
  const pair = one(page, '[data-anim=intro-zz]');
  const [z1, z2] = all(page, '[data-anim=intro-z]');
  const bu = one(page, '[data-anim=intro-bu]');
  const prep = one(page, '[data-anim=intro-prep]');
  const marks = all(page, '[data-anim=intro-arc]');
  const target = one(page, '[data-anim=header-mark]');
  const header = all(page, '[data-anim=header-brand], [data-anim=header-nav]');
  if (!cover || !backdrop || !mark || !pair || !z1 || !z2 || !bu || !prep || !target) {
    showEverything(page);
    master.addLabel('hero', 0);
    return () => {};
  }

  let finished = false;
  const finish = () => {
    if (finished) return;
    finished = true;
    master.timeScale(1);
    gsap.set(cover, { autoAlpha: 0, display: 'none' });
    gsap.set(header, { autoAlpha: 1 });
    markIntroSeen();
    stopSkip();
  };
  // Any tap, key or scroll hurries the opening along instead of making anyone wait.
  const hurry = () => {
    if (!finished) master.timeScale(6);
  };
  const events = ['pointerdown', 'keydown', 'wheel', 'touchmove'] as const;
  events.forEach((e) => window.addEventListener(e, hurry, { passive: true }));
  const stopSkip = () => events.forEach((e) => window.removeEventListener(e, hurry));
  // Never leave the cover up, whatever happens to the timeline.
  gsap.delayedCall(7, finish);

  // Centre the Zs while the rest of the name is still hidden.
  const centre = (r: DOMRect) => ({ x: r.left + r.width / 2, y: r.top + r.height / 2 });
  gsap.set(mark, {
    x: centre(mark.getBoundingClientRect()).x - centre(pair.getBoundingClientRect()).x,
  });

  // Where the name lands: the header's wordmark, measured when the flight starts.
  let flight: { x: number; y: number; scale: number } | null = null;
  const fly = () => {
    if (!flight) {
      const from = mark.getBoundingClientRect();
      const to = target.getBoundingClientRect();
      flight = {
        x: centre(to).x - centre(from).x,
        y: centre(to).y - centre(from).y,
        scale: to.height / from.height,
      };
    }
    return flight;
  };

  master
    // Asleep: a small z, then a larger Z, drifting up.
    .fromTo(
      z1,
      { autoAlpha: 0, xPercent: -30, yPercent: 70, scale: 0.55, rotation: -14 },
      { autoAlpha: 1, yPercent: 30, duration: 0.6, ease: 'sine.out' },
      0.1,
    )
    .fromTo(
      z2,
      { autoAlpha: 0, xPercent: 25, yPercent: -5, scale: 0.75, rotation: -14 },
      { autoAlpha: 1, yPercent: -45, duration: 0.6, ease: 'sine.out' },
      0.3,
    )
    // Awake: they snap side by side and buzz like a phone getting a reminder.
    .to([z1, z2], {
      xPercent: 0,
      yPercent: 0,
      scale: 1,
      rotation: 0,
      duration: 0.3,
      ease: 'back.out(2.2)',
    })
    .addLabel('buzz')
    .to(
      pair,
      {
        keyframes: { x: [0, -5, 5, -4, 4, -2, 2, 0], rotation: [0, -3, 3, -2, 2, -1, 1, 0] },
        duration: 0.42,
        ease: 'none',
      },
      'buzz',
    )
    .fromTo(
      marks,
      { autoAlpha: 0, scale: 0.5 },
      { autoAlpha: 1, scale: 1, duration: 0.1, ease: 'power1.out', yoyo: true, repeat: 3 },
      'buzz',
    )
    // The name forms around them.
    .addLabel('word', 'buzz+=0.32')
    .to(mark, { x: 0, duration: 0.55, ease: 'power3.inOut' }, 'word')
    .fromTo(
      bu,
      { autoAlpha: 0, xPercent: 105 },
      { autoAlpha: 1, xPercent: 0, duration: 0.6, ease: 'power3.out' },
      'word',
    )
    .fromTo(
      prep,
      { autoAlpha: 0, xPercent: -105 },
      { autoAlpha: 1, xPercent: 0, duration: 0.6, ease: 'power3.out' },
      'word',
    )
    // And flies into the header as the page appears beneath.
    .addLabel('fly', '+=0.2')
    .to(
      mark,
      {
        x: () => fly().x,
        y: () => fly().y,
        scale: () => fly().scale,
        duration: 0.75,
        ease: 'power3.inOut',
      },
      'fly',
    )
    .to(backdrop, { autoAlpha: 0, duration: 0.55, ease: 'power1.inOut' }, 'fly+=0.2')
    .to(header, { autoAlpha: 1, duration: 0.25, ease: 'none' }, 'fly+=0.62')
    .to(mark, { autoAlpha: 0, duration: 0.2, ease: 'none' }, 'fly+=0.66')
    .add(finish, 'fly+=0.9')
    .addLabel('hero', 'fly+=0.25');

  return stopSkip;
}

/** One picture per section, each acting out what it shows when it scrolls into view. */
function animateSections(page: Scope) {
  routine(page);
  lockScreen(page);
  nightBand(page);
  journal(page);
  plan(page);
  sunrise(page);
}

/** The day lays itself out; then, with the scroll, bedtime moves earlier week by week. */
function routine(page: Scope) {
  const fig = one(page, '[data-anim=routine]');
  if (!fig) return;
  const blocks = all(fig, '[data-anim=routine-block]');
  const bed = one(fig, '[data-role=bed]');
  const sliver = one(fig, '[data-role=journal]');
  const label = one(fig, '[data-anim=routine-bedtime]');
  const decision = one(fig, '[data-anim=routine-decision]');

  gsap
    .timeline({ scrollTrigger: { trigger: fig, start: 'top 80%', once: true } })
    .from(blocks, {
      scaleX: 0,
      transformOrigin: 'left center',
      duration: 0.55,
      ease: 'power2.out',
      stagger: 0.08,
    })
    .from(decision, { autoAlpha: 0, y: 18, duration: 0.5, ease: 'power2.out' }, '-=0.15')
    .to(
      decision,
      { keyframes: { x: [0, -6, 6, -4, 4, 0] }, duration: 0.45, ease: 'none' },
      '+=0.1',
    );

  if (!bed || !sliver || !label) return;
  const first = minutesOf(BEDTIME_FIRST);
  const last = minutesOf(BEDTIME_LAST);
  const weeks = (first - last) / BEDTIME_STEP_MINUTES;
  const at = (minutes: number) => dayPos(clockOf(minutes));
  const show = (week: number) => {
    label.textContent = `Week ${week + 1}: bed at ${clockLabel(first - week * BEDTIME_STEP_MINUTES)}`;
  };
  const state = { week: 0 };
  show(0);
  gsap
    .timeline({
      defaults: { ease: 'none' },
      scrollTrigger: { trigger: fig, start: 'top 65%', end: 'bottom 30%', scrub: 0.5 },
    })
    .fromTo(
      bed,
      { left: `${at(first)}%`, width: `${100 - at(first)}%` },
      { left: `${at(last)}%`, width: `${100 - at(last)}%` },
      0,
    )
    .fromTo(sliver, { left: `${at(first - 10)}%` }, { left: `${at(last - 10)}%` }, 0)
    .fromTo(state, { week: 0 }, { week: weeks, onUpdate: () => show(Math.round(state.week)) }, 0);
}

/** A locked phone through the evening: the clock runs on with the scroll and reminders land. */
function lockScreen(page: Scope) {
  const fig = one(page, '[data-anim=lock]');
  const clock = fig && one(fig, '[data-anim=lock-clock]');
  if (!fig || !clock) return;
  const night = one(fig, '[data-anim=lock-night]');
  const quiet = one(fig, '[data-anim=lock-quiet]');

  const notices = all(fig, '[data-anim=lock-notice]').map((wrap) => {
    const card = wrap.firstElementChild as HTMLElement;
    const arrive = gsap
      .timeline({ paused: true })
      .fromTo(wrap, { height: 0 }, { height: 'auto', duration: 0.35, ease: 'power2.out' })
      .fromTo(
        card,
        { autoAlpha: 0, y: -14, scale: 0.96 },
        { autoAlpha: 1, y: 0, scale: 1, duration: 0.45, ease: 'back.out(1.6)' },
        0.05,
      )
      .to(card, { keyframes: { x: [0, -4, 4, -3, 3, 0] }, duration: 0.36, ease: 'none' }, 0.32);
    // The first one lands just after the evening starts, so it is seen arriving.
    const at = Math.max(Number(wrap.dataset.at ?? 0) / LOCK_SPAN_MINUTES, 0.03);
    return { at, arrive, shown: false };
  });
  const sync = (progress: number, instant = false) => {
    for (const n of notices) {
      const on = progress >= n.at;
      if (on === n.shown) continue;
      n.shown = on;
      if (instant) n.arrive.progress(on ? 1 : 0);
      else if (on) n.arrive.play();
      else n.arrive.reverse();
    }
  };

  // The lock screen shows the time without AM or PM.
  const clockText = (minutes: number) => {
    const [h, m] = clockOf(minutes);
    return `${h % 12 || 12}:${String(m).padStart(2, '0')}`;
  };
  const time = { m: 0 };
  clock.textContent = clockText(LOCK_START_MINUTES);
  const tl = gsap
    .timeline({
      defaults: { ease: 'none' },
      scrollTrigger: {
        trigger: fig,
        start: 'top 75%',
        end: 'bottom 20%',
        scrub: 0.4,
        onUpdate: (self) => sync(self.progress),
      },
    })
    .fromTo(
      time,
      { m: 0 },
      {
        m: LOCK_SPAN_MINUTES,
        duration: 1,
        onUpdate: () => {
          clock.textContent = clockText(LOCK_START_MINUTES + time.m);
        },
      },
      0,
    );
  if (night) tl.fromTo(night, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.45 }, 0.5);
  if (quiet)
    tl.fromTo(quiet, { autoAlpha: 0, y: -6 }, { autoAlpha: 1, y: 0, duration: 0.04 }, 0.96);
  sync(tl.scrollTrigger?.progress ?? 0, true);
}

/** Stars come out as the night section scrolls in. */
function nightBand(page: Scope) {
  const band = one(page, '[data-anim=night-band]');
  if (!band) return;
  const stars = all(band, '[data-anim=star]');
  gsap.fromTo(
    stars,
    { autoAlpha: 0, scale: 0.3 },
    {
      autoAlpha: (_i: number, el: HTMLElement) => Number(el.dataset.o ?? 0.5),
      scale: 1,
      ease: 'none',
      stagger: { each: 0.03, from: 'random' },
      scrollTrigger: { trigger: band, start: 'top 90%', end: 'top 25%', scrub: 0.6 },
    },
  );
}

/** The candle lights, a spoken walk-through comes in word by word, and becomes notes. */
function journal(page: Scope) {
  const fig = one(page, '[data-anim=journal]');
  if (!fig) return;
  const words = one(fig, '[data-anim=journal-words]');
  const split = words ? SplitText.create(words, { type: 'words' }) : null;
  const bars = all(fig, '[data-anim=journal-bar]');
  const tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 75%', once: true } });
  tl.from(one(fig, '[data-anim=journal-glow]'), {
    autoAlpha: 0,
    scale: 0.3,
    duration: 1.1,
    ease: 'power2.out',
  })
    .from(
      one(fig, '[data-anim=journal-start]'),
      { scale: 0.86, duration: 0.35, ease: 'back.out(3)' },
      0.35,
    )
    .from(
      one(fig, '[data-anim=journal-say]'),
      { autoAlpha: 0, y: 16, duration: 0.5, ease: 'power2.out' },
      0.55,
    );
  if (split) {
    tl.from(
      split.words,
      { autoAlpha: 0, y: 4, duration: 0.25, stagger: 0.07, ease: 'power1.out' },
      0.85,
    );
  }
  tl.fromTo(
    bars,
    { scaleY: 0.25 },
    {
      scaleY: 1,
      transformOrigin: 'center bottom',
      duration: 0.16,
      ease: 'sine.inOut',
      stagger: { each: 0.04, repeat: 10, yoyo: true },
    },
    0.85,
  )
    .from(
      one(fig, '[data-anim=journal-notes]'),
      { autoAlpha: 0, y: 22, duration: 0.6, ease: 'power3.out' },
      '>-0.3',
    )
    .from(
      all(fig, '[data-anim=journal-chip]'),
      { autoAlpha: 0, scale: 0.4, duration: 0.4, ease: 'back.out(2.4)', stagger: 0.15 },
      '>-0.2',
    );
}

/** The plan ring draws to day 12 and the first milestone gets its tick. */
function plan(page: Scope) {
  const fig = one(page, '[data-anim=plan]');
  if (!fig) return;
  const ring = one<SVGCircleElement>(fig, '[data-anim=plan-ring]');
  const day = one(fig, '[data-anim=plan-day]');
  const length = 2 * Math.PI * PLAN_RING_RADIUS;
  const count = { d: 1 };
  if (day) day.textContent = 'Day 1';
  const tl = gsap.timeline({ scrollTrigger: { trigger: fig, start: 'top 75%', once: true } });
  if (ring) {
    tl.fromTo(
      ring,
      { attr: { 'stroke-dasharray': `0 ${length}` } },
      {
        attr: { 'stroke-dasharray': `${(PLAN_DAY / PLAN_DAYS) * length} ${length}` },
        duration: 1.3,
        ease: 'power2.out',
      },
      0,
    );
  }
  tl.fromTo(
    count,
    { d: 1 },
    {
      d: PLAN_DAY,
      duration: 1.3,
      ease: 'power2.out',
      onUpdate: () => {
        if (day) day.textContent = `Day ${Math.round(count.d)}`;
      },
    },
    0,
  ).from(
    one(fig, '[data-anim=plan-check]'),
    { scale: 0, duration: 0.45, ease: 'back.out(2.6)' },
    1,
  );
}

/** The steps fill in one after another as the list scrolls past. */
function animateSteps(page: Scope, wide: boolean) {
  const list = one(page, '[data-anim=steps]');
  if (!list) return;
  const fills = all(list, '[data-anim=step-fill]');
  const lines = all(list, '[data-anim=step-line]');
  const axis = wide ? 'scaleX' : 'scaleY';
  gsap.set(lines, { [axis]: 0, transformOrigin: wide ? 'left center' : 'center top' });
  gsap.set(fills, { scale: 0 });
  const tl = gsap.timeline({
    defaults: { ease: 'none' },
    scrollTrigger: { trigger: list, start: 'top 80%', end: 'bottom 60%', scrub: 0.5 },
  });
  fills.forEach((fill, i) => {
    tl.to(fill, { scale: 1, duration: 0.12, ease: 'back.out(2)' }, i * 0.5);
    const line = lines[i];
    if (line) tl.to(line, { [axis]: 1, duration: 0.36 }, i * 0.5 + 0.12);
  });
}

/** Gold light rises behind the last call to action. */
function sunrise(page: Scope) {
  const sun = one(page, '[data-anim=sunrise]');
  const section = sun?.parentElement;
  if (!sun || !section) return;
  gsap.fromTo(
    sun,
    { yPercent: 30, autoAlpha: 0.25 },
    {
      yPercent: 0,
      autoAlpha: 1,
      ease: 'none',
      scrollTrigger: { trigger: section, start: 'top bottom', end: 'bottom bottom', scrub: 0.6 },
    },
  );
}
