import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Link } from 'react-router';
import './intro.css';
import { cn } from '../../lib/cn';
import { Wordmark } from '../../components/ui/Logo';
import { AiPill, Badge } from '../../components/ui/Badge';
import { buttonClass } from '../../components/ui/Button';
import { ThemeToggle } from '../../components/layout/Topbar';
import { Spinner } from '../../components/ui/States';
import {
  Calendar,
  CalendarCheck,
  CalendarX,
  ChartColumn,
  Check,
  ChevronDown,
  Lock,
  MessageCircle,
  Phone,
  UserRound,
  Users,
  CircleUserRound,
} from '../../components/icons';

const SECTIONS = [
  { id: 'welcome', label: 'Welcome' },
  { id: 'call', label: 'A call comes in' },
  { id: 'availability', label: 'Real availability' },
  { id: 'team', label: 'Your team' },
  { id: 'features', label: 'Features' },
  { id: 'start', label: 'Get started' },
];

const delay = (ms: number) => ({ '--d': `${ms}ms` }) as CSSProperties;

function Section({ id, className, children, labelledBy }: { id: string; className?: string; children: ReactNode; labelledBy: string }) {
  return (
    <section
      id={id}
      data-section
      data-reveal="none"
      aria-labelledby={labelledBy}
      className={cn('relative flex min-h-dvh snap-start items-center px-4 pt-24 pb-16 sm:px-10', className)}
    >
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

export function IntroPage() {
  const scroller = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const root = scroller.current;
    if (!root || typeof IntersectionObserver === 'undefined') return;
    root.classList.add('intro-ready');

    const reveal = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) (e.target as HTMLElement).dataset.visible = 'true';
      },
      { root, threshold: 0.2 },
    );
    root.querySelectorAll('[data-reveal]').forEach((n) => reveal.observe(n));

    const sections = Array.from(root.querySelectorAll<HTMLElement>('[data-section]'));
    const spy = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setActive(sections.indexOf(e.target as HTMLElement));
      },
      { root, threshold: 0.55 },
    );
    sections.forEach((s) => spy.observe(s));

    return () => {
      reveal.disconnect();
      spy.disconnect();
    };
  }, []);

  const goTo = (i: number) => {
    const target = scroller.current?.querySelector<HTMLElement>(`#${SECTIONS[i]!.id}`);
    target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };

  return (
    <div ref={scroller} className="h-dvh snap-y snap-proximity overflow-x-hidden overflow-y-auto scroll-smooth md:snap-mandatory">
      <header className="fixed inset-x-0 top-0 z-20 border-b border-line bg-surface/95">
        <div className="mx-auto flex min-h-16 max-w-6xl items-center gap-3 px-4 sm:px-10">
          <Link to="/" className="flex-1 no-underline" aria-label="VoxDesk AI home">
            <Wordmark size={32} />
          </Link>
          <ThemeToggle />
          <Link to="/login" className={buttonClass('outline', 'md', 'no-underline')}>
            Sign in
          </Link>
        </div>
      </header>

      <nav aria-label="Sections" className="fixed top-1/2 right-3 z-20 hidden -translate-y-1/2 flex-col gap-1 md:flex lg:right-6">
        {SECTIONS.map((s, i) => (
          <button
            key={s.id}
            type="button"
            onClick={() => goTo(i)}
            aria-label={s.label}
            aria-current={active === i ? 'true' : undefined}
            className="group flex size-11 items-center justify-center"
          >
            <span className={cn('block rounded-full transition-all', active === i ? 'h-6 w-2.5 bg-brand' : 'size-2.5 bg-line-strong group-hover:bg-ink-muted')} />
          </button>
        ))}
      </nav>

      <main>
        <Section id="welcome" labelledBy="welcome-title">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_1fr]">
            <div className="flex flex-col gap-6">
              <span data-reveal className="flex items-center gap-2 type-label text-ink-muted" style={delay(0)}>
                <AiPill /> AI receptionist for salons
              </span>
              <h1 id="welcome-title" data-reveal className="font-display text-[40px] leading-[44px] font-bold sm:text-[56px] sm:leading-[60px]" style={delay(120)}>
                Your salon’s receptionist that never misses a call.
              </h1>
              <p data-reveal className="max-w-xl type-body-lg text-ink-muted" style={delay(240)}>
                VoxDesk AI answers calls in Urdu and English, books appointments from your live schedule, and keeps your owner, reception and staff dashboards in sync.
              </p>
              <div data-reveal className="flex flex-wrap gap-3" style={delay(360)}>
                <Link to="/login" className={buttonClass('primary', 'md', 'no-underline')}>
                  Sign in to your dashboard
                </Link>
                <button type="button" onClick={() => goTo(1)} className={buttonClass('outline')}>
                  See how it works
                </button>
              </div>
            </div>
            <HeroArt />
          </div>
          <button
            type="button"
            onClick={() => goTo(1)}
            className="absolute bottom-6 left-1/2 flex -translate-x-1/2 flex-col items-center gap-1 type-caption text-ink-muted"
          >
            Scroll or swipe
            <ChevronDown size={20} strokeWidth={1.75} aria-hidden="true" className="intro-nudge" />
          </button>
        </Section>

        <Section id="call" labelledBy="call-title" className="bg-raised">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <div className="flex flex-col gap-4">
              <span data-reveal className="type-label text-brand-strong">Step 1</span>
              <h2 id="call-title" data-reveal className="type-heading-lg" style={delay(100)}>
                A customer calls. The AI picks up.
              </h2>
              <p data-reveal className="max-w-lg text-ink-muted" style={delay(200)}>
                Day or night, the receptionist understands what the caller wants, checks the real schedule and only says “booked” once the system has confirmed it.
              </p>
            </div>
            <CallDemo />
          </div>
        </Section>

        <Section id="availability" labelledBy="availability-title">
          <div className="grid items-center gap-12 lg:grid-cols-2">
            <SlotDemo />
            <div className="flex flex-col gap-4 lg:order-first">
              <span data-reveal className="type-label text-brand-strong">Step 2</span>
              <h2 id="availability-title" data-reveal className="type-heading-lg" style={delay(100)}>
                Booked only when it is really free.
              </h2>
              <p data-reveal className="max-w-lg text-ink-muted" style={delay(200)}>
                Free times come straight from each stylist’s working hours, breaks and existing bookings. Two people can never be booked into the same slot, whether the booking comes from a call, reception or online.
              </p>
            </div>
          </div>
        </Section>

        <Section id="team" labelledBy="team-title" className="bg-plum text-on-plum">
          <div className="flex flex-col gap-10">
            <div className="flex max-w-2xl flex-col gap-4">
              <span data-reveal className="type-label text-marigold">Step 3</span>
              <h2 id="team-title" data-reveal className="type-heading-lg" style={delay(100)}>
                One booking. Three dashboards.
              </h2>
              <p data-reveal className="opacity-90" style={delay(200)}>
                The moment a booking is confirmed it appears for the owner, reception and the stylist doing the work. Each person sees only what their role needs.
              </p>
            </div>
            <div className="grid gap-6 md:grid-cols-3">
              <RoleCard d={250} icon={<ChartColumn size={20} strokeWidth={1.75} aria-hidden="true" />} title="Owner" body="Revenue, staff performance, services and prices, and how the AI receptionist answers." />
              <RoleCard d={400} icon={<Users size={20} strokeWidth={1.75} aria-hidden="true" />} title="Reception" body="Today’s schedule, new bookings, rescheduling and cancellation requests." />
              <RoleCard d={550} icon={<CircleUserRound size={20} strokeWidth={1.75} aria-hidden="true" />} title="Staff" body="Their own appointments, working hours and the notes for each customer." />
            </div>
          </div>
        </Section>

        <Section id="features" labelledBy="features-title" className="bg-raised">
          <div className="flex flex-col gap-10">
            <h2 id="features-title" data-reveal className="max-w-2xl type-heading-lg">
              Built for how a busy salon actually works.
            </h2>
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {[
                { icon: Phone, title: 'Answers every call', body: 'Around the clock, including while you are with a client.' },
                { icon: MessageCircle, title: 'Urdu and English', body: 'Callers speak the way they are comfortable.' },
                { icon: CalendarCheck, title: 'Live availability', body: 'Checks real free times before it books anything.' },
                { icon: CalendarX, title: 'Cancellations, reviewed', body: 'Requests go to reception, who confirm or keep the booking.' },
                { icon: Calendar, title: 'Google Calendar sync', body: 'Bookings show up in each stylist’s calendar.' },
                { icon: Lock, title: 'Secure payments', body: 'Pro plan billing runs through Stripe. Card details never touch VoxDesk.' },
              ].map((f, i) => (
                <div key={f.title} data-reveal="scale" style={delay(80 * i)} className="flex flex-col gap-3 rounded-lg border border-line bg-surface p-6">
                  <span className="flex size-11 items-center justify-center rounded-md bg-brand text-on-brand">
                    <f.icon size={20} strokeWidth={1.75} aria-hidden="true" />
                  </span>
                  <h3 className="type-heading-sm">{f.title}</h3>
                  <p className="text-ink-muted">{f.body}</p>
                </div>
              ))}
            </div>
          </div>
        </Section>

        <Section id="start" labelledBy="start-title">
          <div className="flex flex-col items-center gap-6 text-center">
            <img data-reveal="scale" src="/logos/voxdesk-app-icon.svg" alt="" width={88} height={88} className="rounded-[22px]" />
            <h2 id="start-title" data-reveal className="max-w-2xl type-heading-lg" style={delay(120)}>
              Ready to see your salon’s day at a glance?
            </h2>
            <p data-reveal className="max-w-xl text-ink-muted" style={delay(220)}>
              Sign in with the account your salon gave you. Start on the Free plan and move to Pro when you want to manage services and prices.
            </p>
            <div data-reveal style={delay(320)}>
              <Link to="/login" className={buttonClass('primary', 'md', 'no-underline px-6')}>
                Sign in
              </Link>
            </div>
            <button type="button" onClick={() => goTo(0)} className="mt-4 min-h-11 type-body-sm font-semibold text-brand-strong">
              Back to top
            </button>
          </div>
        </Section>
      </main>
    </div>
  );
}

function HeroArt() {
  return (
    <div data-reveal="right" style={delay(300)} className="relative mx-auto aspect-square w-full max-w-[440px]" aria-hidden="true">
      <div className="intro-float absolute top-[4%] left-[18%] h-[58%] w-[52%] rounded-lg bg-brand" />
      <div className="intro-float-slow absolute top-0 right-0 h-[86%] w-[22%] rounded-lg bg-plum" />
      <div className="intro-float-slow absolute bottom-0 left-0 h-[52%] w-[14%] rounded-lg bg-marigold" />
      <div className="intro-float absolute bottom-[6%] left-[22%] h-[13%] w-[50%] rounded-full bg-peacock" />
      <div className="absolute top-[15%] left-[26%] flex size-[36%] items-center justify-center rounded-[22%] bg-raised">
        <img src="/logos/voxdesk-mark.svg" alt="" className="block w-[78%] dark:hidden" />
        <img src="/logos/voxdesk-mark-dark.svg" alt="" className="hidden w-[78%] dark:block" />
      </div>
      <svg viewBox="0 0 100 100" className="absolute top-[4%] left-[52%] w-[26%] overflow-visible">
        <path className="intro-wave" d="M10 60 A30 30 0 0 0 40 30" fill="none" stroke="var(--accent-marigold)" strokeWidth="7" strokeLinecap="round" />
        <path className="intro-wave intro-wave-2" d="M10 90 A60 60 0 0 0 70 30" fill="none" stroke="var(--accent-marigold)" strokeWidth="7" strokeLinecap="round" />
      </svg>
    </div>
  );
}

function Bubble({ from, d, children }: { from: 'caller' | 'ai'; d: number; children: ReactNode }) {
  return (
    <li data-reveal={from === 'caller' ? 'right' : 'left'} style={delay(d)} className={cn('flex max-w-[85%] flex-col gap-1', from === 'caller' ? 'self-end items-end' : 'self-start')}>
      <span className="flex items-center gap-1.5 type-caption text-ink-muted">
        {from === 'ai' ? (
          <>
            <AiPill /> Zara, AI receptionist
          </>
        ) : (
          <>
            <UserRound size={14} strokeWidth={1.75} aria-hidden="true" /> Caller
          </>
        )}
      </span>
      <span className={cn('rounded-lg px-4 py-2.5', from === 'caller' ? 'bg-surface ring-1 ring-line' : 'bg-brand text-on-brand')}>{children}</span>
    </li>
  );
}

function CallDemo() {
  return (
    <div data-reveal="scale" className="rounded-lg border border-line bg-surface p-4 sm:p-6">
      <div className="mb-4 flex items-center justify-between gap-3 border-b border-line pb-3">
        <span className="flex items-center gap-2 font-semibold">
          <Phone size={20} strokeWidth={1.75} aria-hidden="true" /> Incoming call
        </span>
        <Badge tone="success">Live</Badge>
      </div>
      <ol className="flex flex-col gap-3" aria-label="Example call">
        <Bubble from="caller" d={200}>Hi, I want a haircut tomorrow afternoon.</Bubble>
        <Bubble from="ai" d={700}>Of course. Do you have a preferred stylist?</Bubble>
        <Bubble from="caller" d={1200}>Ayesha, if she is free.</Bubble>
        <li data-reveal style={delay(1700)} className="flex items-center gap-2 self-center type-caption text-ink-muted">
          <Spinner size={14} /> Checking Ayesha’s live schedule
        </li>
        <Bubble from="ai" d={2300}>Ayesha is free at 3:30 PM. Shall I book it?</Bubble>
        <Bubble from="caller" d={2800}>Yes, please.</Bubble>
        <li data-reveal style={delay(3300)} className="flex items-center gap-2 self-center rounded-full bg-success-bg px-3 py-1 type-caption font-semibold text-success-fg">
          <Check size={14} strokeWidth={2} aria-hidden="true" /> Booking confirmed by the system
        </li>
        <Bubble from="ai" d={3800}>Done. Your haircut with Ayesha is booked for tomorrow at 3:30 PM.</Bubble>
      </ol>
    </div>
  );
}

function SlotDemo() {
  const slots = [
    { t: '1:00 PM', state: 'free' },
    { t: '1:45 PM', state: 'taken' },
    { t: '2:30 PM', state: 'break' },
    { t: '3:30 PM', state: 'pick' },
    { t: '4:15 PM', state: 'free' },
    { t: '5:00 PM', state: 'taken' },
  ] as const;
  return (
    <div data-reveal="scale" className="flex flex-col gap-4 rounded-lg border border-line bg-raised p-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <p className="font-semibold">Ayesha Rahman · Haircut</p>
          <p className="type-body-sm text-ink-muted">Tomorrow · 45 min</p>
        </div>
        <Badge tone="neutral">Live schedule</Badge>
      </div>
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
        {slots.map((s, i) => (
          <div
            key={s.t}
            data-reveal
            style={delay(120 * i)}
            className={cn(
              'flex min-h-14 flex-col items-center justify-center rounded-md border px-2 py-2',
              s.state === 'taken' && 'border-line bg-surface text-ink-muted line-through',
              s.state === 'break' && 'border-dashed border-line-strong bg-surface text-ink-muted',
              (s.state === 'free' || s.state === 'pick') && 'border-line-strong bg-raised',
              s.state === 'pick' && 'intro-slot-pick',
            )}
          >
            <span className="font-semibold">{s.t}</span>
            <span className="type-caption">{s.state === 'taken' ? 'Booked' : s.state === 'break' ? 'Break' : 'Free'}</span>
          </div>
        ))}
      </div>
      <div data-reveal style={delay(1500)} className="flex items-center gap-3 rounded-md bg-success-bg px-4 py-3 text-success-fg">
        <CalendarCheck size={20} strokeWidth={1.75} aria-hidden="true" />
        <span className="font-semibold">Booked: Haircut with Ayesha, tomorrow 3:30 PM</span>
      </div>
    </div>
  );
}

function RoleCard({ icon, title, body, d }: { icon: ReactNode; title: string; body: string; d: number }) {
  return (
    <div data-reveal style={delay(d)} className="flex flex-col gap-3 rounded-lg bg-raised p-6 text-ink">
      <span className="flex size-11 items-center justify-center rounded-md bg-marigold text-on-accent">{icon}</span>
      <h3 className="type-heading-sm">{title}</h3>
      <p className="text-ink-muted">{body}</p>
    </div>
  );
}
