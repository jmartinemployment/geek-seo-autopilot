'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useDeviceId } from '@/hooks/use-device-id';

type State = 'CHECKING' | 'EMAIL' | 'OTP_SENT' | 'ERROR';

export default function SignInPage() {
  const router = useRouter();
  const deviceId = useDeviceId();
  const [state, setState] = useState<State>('CHECKING');
  const [email, setEmail] = useState('');
  const [otp, setOtp] = useState('');
  const [error, setError] = useState('');

  // CHECKING: attempt device trust on mount
  useEffect(() => {
    if (!deviceId) return;
    const storedEmail = document.cookie
      .split('; ')
      .find(r => r.startsWith('user_email='))
      ?.split('=')[1];

    if (!storedEmail) { setState('EMAIL'); return; }

    fetch('/api/auth/device-trust', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email: storedEmail, deviceId }),
    }).then(r => {
      if (r.ok) router.push('/dashboard');
      else setState('EMAIL');
    }).catch(() => setState('EMAIL'));
  }, [deviceId]);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const r = await fetch('/api/auth/send-otp', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email }),
    });
    if (r.ok) setState('OTP_SENT');
    else setError('Failed to send code. Please try again.');
  };

  const handleVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    const r = await fetch('/api/auth/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, otp, deviceId }),
    });
    if (r.ok) {
      // Store email for future device trust checks
      document.cookie = `user_email=${email}; path=/; max-age=${60 * 60 * 24 * 30}`;
      router.push('/dashboard');
    } else {
      const data = await r.json();
      setError(data.error || 'Invalid code. Please try again.');
    }
  };

  if (state === 'CHECKING') {
    return <div className="flex items-center justify-center h-screen">Signing in...</div>;
  }

  return (
    <div className="flex items-center justify-center h-screen bg-slate-50">
      <div className="bg-white p-8 rounded-lg shadow w-full max-w-sm">
        <h1 className="text-2xl font-semibold mb-6">Sign in</h1>

        {state === 'EMAIL' && (
          <form onSubmit={handleSendOtp} className="space-y-4">
            <input
              type="email" value={email} onChange={e => setEmail(e.target.value)}
              placeholder="your@email.com" required
              className="w-full border rounded px-3 py-2"
            />
            <button type="submit" className="w-full bg-blue-600 text-white rounded py-2">
              Send code
            </button>
          </form>
        )}

        {state === 'OTP_SENT' && (
          <form onSubmit={handleVerify} className="space-y-4">
            <p className="text-sm text-slate-500">Code sent to <strong>{email}</strong></p>
            <input
              type="text" value={otp} onChange={e => setOtp(e.target.value)}
              placeholder="6-digit code" maxLength={6} required
              className="w-full border rounded px-3 py-2 tracking-widest text-center text-lg"
            />
            <button type="submit" className="w-full bg-blue-600 text-white rounded py-2">
              Verify
            </button>
            <button
              type="button" onClick={() => setState('EMAIL')}
              className="w-full text-sm text-slate-400 underline"
            >
              Use a different email
            </button>
          </form>
        )}

        {error && <p className="mt-4 text-sm text-red-500">{error}</p>}
      </div>
    </div>
  );
}
