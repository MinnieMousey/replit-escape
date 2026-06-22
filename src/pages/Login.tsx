import React, { useState, useEffect } from 'react';
import { useNavigate } from '@tanstack/react-router';
import { SkyBackground } from '@/components/sky/SkyBackground';
import { Button } from '@/components/ui/button';

const ACCOUNT_KEY = 'cromos-account';

interface Account { username: string; password: string; }

function loadAccount(): Account | null {
  try {
    const raw = localStorage.getItem(ACCOUNT_KEY);
    return raw ? JSON.parse(raw) as Account : null;
  } catch {
    return null;
  }
}

export default function Login() {
  const navigate = useNavigate(); const setLocation = (to: string) => navigate({ to: to as any });
  const [account, setAccount] = useState<Account | null>(null);
  const [mode, setMode] = useState<'signin' | 'signup'>('signup');

  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const acc = loadAccount();
    if (acc) {
      setAccount(acc);
      setMode('signin');
      setUsername(acc.username);
    } else {
      setMode('signup');
    }
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (mode === 'signup') {
      if (username.trim().length < 3) { setError('Username must be at least 3 characters.'); return; }
      if (password.length < 4) { setError('Password must be at least 4 characters.'); return; }
      if (password !== confirm) { setError('Passwords do not match.'); return; }
      const acc: Account = { username: username.trim(), password };
      localStorage.setItem(ACCOUNT_KEY, JSON.stringify(acc));
      setLocation('/select');
      return;
    }

    // signin
    if (!account) { setMode('signup'); return; }
    if (password !== account.password) { setError('Incorrect password.'); return; }
    setLocation('/select');
  };

  const switchAccount = () => {
    localStorage.removeItem(ACCOUNT_KEY);
    setAccount(null);
    setMode('signup');
    setUsername('');
    setPassword('');
    setConfirm('');
    setError('');
  };

  return (
    <>
      <SkyBackground />
      <div className="min-h-screen flex items-center justify-center p-6 font-mono">
        <div className="w-full max-w-md bg-white/10 backdrop-blur-md rounded-2xl border border-white/20 p-8 text-white shadow-2xl">

          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 mb-3">
              <div className="w-9 h-9 rounded-lg bg-sky-500/30 border border-sky-400/50 flex items-center justify-center text-sky-300 font-bold">C</div>
              <span className="text-2xl font-bold tracking-widest text-sky-300">CROMOS<span className="text-white/40 text-sm ml-1">OS</span></span>
            </div>
            <p className="text-white/50 text-xs uppercase tracking-widest">AIS Operations Terminal</p>
          </div>

          <h1 className="text-lg font-bold mb-1 text-white">
            {mode === 'signup' ? 'Create your operator account' : `Welcome back, ${account?.username ?? ''}`}
          </h1>
          <p className="text-white/50 text-xs mb-6">
            {mode === 'signup'
              ? 'First-time sign-up. Your password is stored locally in this browser.'
              : 'Enter your password to sign in to the terminal.'}
          </p>

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'signup' && (
              <div>
                <label className="block text-xs text-white/50 uppercase tracking-widest mb-1.5">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={e => setUsername(e.target.value)}
                  data-testid="input-username"
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-4 h-11 text-white text-sm focus:border-sky-400 focus:outline-none"
                  placeholder="e.g. j.officer"
                  autoFocus
                />
              </div>
            )}

            <div>
              <label className="block text-xs text-white/50 uppercase tracking-widest mb-1.5">Password</label>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                data-testid="input-password"
                className="w-full bg-black/30 border border-white/20 rounded-lg px-4 h-11 text-white text-sm focus:border-sky-400 focus:outline-none"
                placeholder="••••••"
                autoFocus={mode === 'signin'}
              />
            </div>

            {mode === 'signup' && (
              <div>
                <label className="block text-xs text-white/50 uppercase tracking-widest mb-1.5">Confirm password</label>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  data-testid="input-confirm"
                  className="w-full bg-black/30 border border-white/20 rounded-lg px-4 h-11 text-white text-sm focus:border-sky-400 focus:outline-none"
                  placeholder="••••••"
                />
              </div>
            )}

            {error && <p className="text-red-400 text-xs">{error}</p>}

            <Button
              type="submit"
              className="w-full h-12 bg-sky-500 hover:bg-sky-400 text-white font-bold text-sm uppercase tracking-widest"
              data-testid="button-auth-submit"
            >
              {mode === 'signup' ? 'Sign up & continue' : 'Sign in'}
            </Button>
          </form>

          {mode === 'signin' && (
            <button
              onClick={switchAccount}
              className="mt-4 text-xs text-white/40 hover:text-white/70 underline w-full text-center"
              data-testid="button-switch-account"
            >
              Not {account?.username}? Create a new account
            </button>
          )}
        </div>
      </div>
    </>
  );
}
