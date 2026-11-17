import { useState, type FormEvent } from 'react';
import { Navigate, useNavigate } from 'react-router';
import { USING_MOCKS, errorMessage } from '../../api';
import { useAuth } from './AuthProvider';
import { homePath } from '../../config/navigation';
import { Wordmark } from '../../components/ui/Logo';
import { TextField } from '../../components/ui/Field';
import { Button } from '../../components/ui/Button';
import { Banner } from '../../components/ui/States';
import { DEMO_ACCOUNTS, DEMO_PASSWORD } from '../../mocks/seed';

export function LoginPage() {
  const { status, session, login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (status === 'authenticated' && session) return <Navigate to={homePath(session.user.role)} replace />;

  async function submit(e: FormEvent) {
    e.preventDefault();
    if (pending) return;
    if (!email.trim() || !password) {
      setError('Enter your email and password.');
      return;
    }
    setPending(true);
    setError(null);
    try {
      const s = await login(email, password);
      navigate(homePath(s.user.role), { replace: true });
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setPending(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center p-4">
      <div className="flex w-full max-w-md flex-col gap-6">
        <Wordmark />
        <form onSubmit={submit} noValidate className="flex flex-col gap-5 rounded-lg border border-line bg-raised p-6">
          <div>
            <h1 className="type-heading-md">Sign in</h1>
            <p className="mt-1 text-ink-muted">Use the account your salon gave you.</p>
          </div>
          {error && <Banner tone="danger">{error}</Banner>}
          <TextField label="Email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <TextField
            label="Password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" variant="primary" loading={pending}>
            Sign in
          </Button>
        </form>

        {USING_MOCKS && (
          <section aria-labelledby="demo-title" className="flex flex-col gap-3 rounded-lg border border-line bg-raised p-6">
            <div>
              <h2 id="demo-title" className="type-heading-sm">
                Demo accounts
              </h2>
              <p className="mt-0.5 type-body-sm text-ink-muted">
                Sample data that lives in your browser only. Password for all: {DEMO_PASSWORD}
              </p>
            </div>
            <ul className="flex flex-col">
              {DEMO_ACCOUNTS.map((a) => (
                <li key={a.email} className="border-t border-line first:border-t-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEmail(a.email);
                      setPassword(DEMO_PASSWORD);
                      setError(null);
                    }}
                    className="flex min-h-11 w-full flex-col items-start py-2 text-left hover:text-brand-strong"
                  >
                    <span className="font-semibold">{a.name}</span>
                    <span className="type-body-sm text-ink-muted">{a.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}
      </div>
    </main>
  );
}
