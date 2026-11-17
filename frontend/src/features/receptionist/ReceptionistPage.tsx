import { useState, type FormEvent } from 'react';
import { api, errorMessage, isApiError, USING_MOCKS } from '../../api';
import { useMutation, useQuery } from '../../lib/query';
import type { ReceptionistConfig, ReceptionistTestReply } from '../../types/domain';
import { useAuth, useSession } from '../auth/AuthProvider';
import { Card, CardHeader } from '../../components/ui/Card';
import { Page, PageHeader } from '../../components/ui/PageHeader';
import { Button } from '../../components/ui/Button';
import { AiPill } from '../../components/ui/Badge';
import { Checkbox, SelectField, Switch, TextAreaField, TextField } from '../../components/ui/Field';
import { Banner, ErrorState, Loading } from '../../components/ui/States';
import { useToast } from '../../components/ui/Toast';
import { Plus, Trash2 } from '../../components/icons';

const LANGUAGES = ['English', 'Urdu', 'Punjabi'];

export function ReceptionistPage() {
  const q = useQuery(['receptionist'], () => api.receptionist.get(), []);
  return (
    <Page>
      <PageHeader title="AI receptionist" description="How your receptionist answers calls, books and hands over to your team." />
      {q.error && !q.data ? (
        <Card>
          <ErrorState error={q.error} onRetry={q.reload} />
        </Card>
      ) : !q.data ? (
        <Card>
          <Loading rows={6} />
        </Card>
      ) : (
        <ReceptionistForm initial={q.data} />
      )}
    </Page>
  );
}

function ReceptionistForm({ initial }: { initial: ReceptionistConfig }) {
  const toast = useToast();
  const { business } = useSession();
  const { updateBusiness } = useAuth();
  const [base, setBase] = useState(initial);
  const [cfg, setCfg] = useState(initial);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const dirty = JSON.stringify(cfg) !== JSON.stringify(base);
  const save = useMutation(() => api.receptionist.update(cfg), { invalidates: ['receptionist'] });

  const patch = <K extends keyof ReceptionistConfig>(k: K, v: Partial<ReceptionistConfig[K]> | ReceptionistConfig[K]) =>
    setCfg((c) => ({ ...c, [k]: typeof v === 'object' && !Array.isArray(v) ? { ...(c[k] as object), ...v } : v }));

  async function submit(e: FormEvent) {
    e.preventDefault();
    const local: Record<string, string> = {};
    if (!cfg.name.trim()) local.name = 'Give your receptionist a name.';
    if (!cfg.greeting.trim()) local.greeting = 'Write the greeting callers hear first.';
    if (!cfg.languages.length) local.languages = 'Choose at least one language.';
    if (cfg.faqs.some((f) => !f.question.trim() || !f.answer.trim())) local.faqs = 'Fill in or remove empty questions.';
    setErrors(local);
    if (Object.keys(local).length) return;
    try {
      const saved = await save.run();
      if (!saved) return;
      setBase(saved);
      setCfg(saved);
      updateBusiness({ ...business, receptionistActive: saved.active });
      toast.success('Receptionist settings saved', saved.active ? 'Changes apply to the next call.' : 'The receptionist is paused.');
    } catch (err) {
      if (isApiError(err) && err.fields) setErrors(err.fields);
      else toast.error('Could not save', errorMessage(err));
    }
  }

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-6">
      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_400px]">
        <div className="flex flex-col gap-6">
          <Card>
            <CardHeader title="Status and voice" />
            <div className="flex flex-col gap-4 px-6 pb-6">
              <Switch
                checked={cfg.active}
                onChange={(v) => patch('active', v)}
                label={cfg.active ? 'Answering calls' : 'Paused'}
                description={cfg.active ? 'Calls are answered by the AI receptionist 24/7.' : `Calls go straight to ${cfg.escalation.transferNumber || 'your transfer number'}.`}
              />
              <TextField label="Receptionist name" value={cfg.name} onChange={(e) => patch('name', e.target.value)} error={errors.name} className="max-w-sm" />
              <TextAreaField label="Greeting" value={cfg.greeting} onChange={(e) => patch('greeting', e.target.value)} error={errors.greeting} rows={3} />
              <fieldset>
                <legend className="type-label">Languages</legend>
                <div className="flex flex-wrap gap-x-6">
                  {LANGUAGES.map((l) => (
                    <Checkbox
                      key={l}
                      label={l}
                      checked={cfg.languages.includes(l)}
                      onChange={(e) => patch('languages', e.target.checked ? [...cfg.languages, l] : cfg.languages.filter((x) => x !== l))}
                    />
                  ))}
                </div>
                {errors.languages && <p className="type-caption font-semibold text-danger-fg">{errors.languages}</p>}
              </fieldset>
            </div>
          </Card>

          <Card>
            <CardHeader title="Frequently asked questions" description="Answers the receptionist gives word for word." />
            <div className="flex flex-col gap-4 px-6 pb-6">
              {cfg.faqs.map((f, i) => (
                <div key={f.id} className="flex flex-col gap-3 rounded-md border border-line p-4">
                  <TextField
                    label={`Question ${i + 1}`}
                    value={f.question}
                    onChange={(e) => patch('faqs', cfg.faqs.map((x) => (x.id === f.id ? { ...x, question: e.target.value } : x)))}
                  />
                  <TextAreaField
                    label="Answer"
                    value={f.answer}
                    rows={2}
                    onChange={(e) => patch('faqs', cfg.faqs.map((x) => (x.id === f.id ? { ...x, answer: e.target.value } : x)))}
                  />
                  <Button size="sm" variant="danger" className="self-start" icon={<Trash2 size={16} strokeWidth={1.75} aria-hidden="true" />} onClick={() => patch('faqs', cfg.faqs.filter((x) => x.id !== f.id))}>
                    Remove
                  </Button>
                </div>
              ))}
              {errors.faqs && <Banner tone="danger">{errors.faqs}</Banner>}
              <Button
                className="self-start"
                icon={<Plus size={20} strokeWidth={1.75} aria-hidden="true" />}
                onClick={() => patch('faqs', [...cfg.faqs, { id: `faq-${Date.now()}`, question: '', answer: '' }])}
              >
                Add question
              </Button>
            </div>
          </Card>

          <Card>
            <CardHeader title="Bookings and cancellations" />
            <div className="flex flex-col gap-2 px-6 pb-6">
              <Switch checked={cfg.booking.allowBooking} onChange={(v) => patch('booking', { allowBooking: v })} label="Book appointments on calls" description="The receptionist checks live availability before it books." />
              <Switch
                checked={cfg.booking.requireConfirmation}
                onChange={(v) => patch('booking', { requireConfirmation: v })}
                label="Hold new bookings as pending"
                description="Reception confirms each AI booking before it is final."
                disabled={!cfg.booking.allowBooking}
              />
              <div className="grid gap-4 py-2 sm:grid-cols-2">
                <TextField label="Minimum notice (hours)" type="number" min={0} value={cfg.booking.minNoticeHours} onChange={(e) => patch('booking', { minNoticeHours: Number(e.target.value) })} />
                <TextField label="Book up to (days ahead)" type="number" min={1} value={cfg.booking.maxDaysAhead} onChange={(e) => patch('booking', { maxDaysAhead: Number(e.target.value) })} />
              </div>
              <Switch checked={cfg.cancellation.allowCancellation} onChange={(v) => patch('cancellation', { allowCancellation: v })} label="Take cancellation requests on calls" />
              <Switch
                checked={cfg.cancellation.sendToReception}
                onChange={(v) => patch('cancellation', { sendToReception: v })}
                label="Send cancellations to reception for review"
                description="When off, the receptionist cancels straight away."
                disabled={!cfg.cancellation.allowCancellation}
              />
            </div>
          </Card>

          <Card>
            <CardHeader title="Escalation and call transfer" />
            <div className="flex flex-col gap-4 px-6 pb-6">
              <TextField label="Transfer number" type="tel" value={cfg.escalation.transferNumber} onChange={(e) => patch('escalation', { transferNumber: e.target.value })} className="max-w-sm" />
              <Switch checked={cfg.escalation.transferOnRequest} onChange={(v) => patch('escalation', { transferOnRequest: v })} label="Transfer when a caller asks for a person" />
              <TextField
                label="Also transfer when callers mention"
                hint="Separate words with commas."
                value={cfg.escalation.transferKeywords.join(', ')}
                onChange={(e) => patch('escalation', { transferKeywords: e.target.value.split(',').map((s) => s.trim()).filter(Boolean) })}
              />
              <SelectField label="Outside opening hours" value={cfg.escalation.afterHours} onChange={(e) => patch('escalation', { afterHours: e.target.value as ReceptionistConfig['escalation']['afterHours'] })} className="max-w-sm">
                <option value="TAKE_MESSAGE">Take a message for the team</option>
                <option value="BOOK_ONLY">Only book appointments</option>
              </SelectField>
            </div>
          </Card>
        </div>

        <TestPanel />
      </div>

      <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-end gap-3 rounded-lg border border-line bg-raised px-6 py-4 lg:bottom-4">
        <span className="mr-auto type-body-sm text-ink-muted">{dirty ? 'You have unsaved changes.' : 'All changes saved.'}</span>
        <Button onClick={() => setCfg(base)} disabled={!dirty || save.pending}>
          Discard
        </Button>
        <Button type="submit" variant="primary" loading={save.pending} disabled={!dirty}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

function TestPanel() {
  const [message, setMessage] = useState('');
  const [log, setLog] = useState<{ q: string; a: ReceptionistTestReply }[]>([]);
  const test = useMutation((m: string) => api.receptionist.test(m));

  async function send() {
    const m = message.trim();
    if (!m) return;
    try {
      const a = await test.run(m);
      if (!a) return;
      setLog((l) => [...l, { q: m, a }]);
      setMessage('');
    } catch {
      /* the error is shown below */
    }
  }

  return (
    <Card className="self-start xl:sticky xl:top-6">
      <CardHeader title="Test interaction" description="Type what a caller might say. Uses your saved settings." />
      <div className="flex flex-col gap-4 px-6 pb-6">
        {log.length === 0 && <p className="type-body-sm text-ink-muted">Try “I want to book a haircut tomorrow” or “Do you have parking?”</p>}
        <ol className="flex flex-col gap-3" aria-live="polite">
          {log.map((t, i) => (
            <li key={i} className="flex flex-col gap-2">
              <p className="self-end rounded-lg bg-surface px-3 py-2">{t.q}</p>
              <div className="flex flex-col gap-1 rounded-lg border border-line px-3 py-2">
                <span className="flex items-center gap-2 type-caption text-ink-muted">
                  <AiPill /> Intent: {t.a.intent.toLowerCase()}
                </span>
                <p>{t.a.reply}</p>
              </div>
              {USING_MOCKS && <p className="type-caption text-ink-muted">{t.a.note}</p>}
            </li>
          ))}
        </ol>
        {test.error !== undefined && <Banner tone="danger">{errorMessage(test.error)}</Banner>}
        <TextAreaField label="Caller says" value={message} onChange={(e) => setMessage(e.target.value)} rows={2} />
        <Button onClick={send} loading={test.pending} disabled={!message.trim()} className="self-start">
          Send test message
        </Button>
      </div>
    </Card>
  );
}
