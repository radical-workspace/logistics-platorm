'use client';

import { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { supabase } from '@/lib/supabaseclient';
import { newPasswordSchema } from '@/lib/validators';

export default function UpdatePasswordPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [hasSession, setHasSession] = useState<boolean | null>(null);
  const [form, setForm] = useState({ password: '', confirmPassword: '' });

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setHasSession(!!data.session);
    });
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      newPasswordSchema.parse(form);

      const { error } = await supabase.auth.updateUser({
        password: form.password,
      });

      if (error) throw error;

      toast.success('Password updated');
      router.push('/dashboard');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to update password';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-8">
        <h1 className="text-3xl font-black mb-2 text-white">Set a new password</h1>
        <p className="text-slate-400 mb-6">Use the recovery link from your email.</p>

        {hasSession === false && (
          <div className="mb-6 text-sm text-slate-300 bg-slate-900 border border-slate-700 rounded-lg p-3">
            No recovery session found. Please open the latest password reset link again.
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
              <label htmlFor="password" className="sr-only">
                New password
              </label>
            <input
                id="password"
              type="password"
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="new-password"
            />
          </div>

          <div>
              <label htmlFor="confirmPassword" className="sr-only">
                Confirm new password
              </label>
            <input
                id="confirmPassword"
              type="password"
              value={form.confirmPassword}
              onChange={(e) => setForm({ ...form, confirmPassword: e.target.value })}
              className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              autoComplete="new-password"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-bold py-3 rounded-lg transition"
          >
            {loading ? 'Updating…' : 'Update password'}
          </button>
        </form>

        <div className="mt-6 text-sm text-slate-400">
          <a className="text-blue-400 hover:text-blue-300" href="/auth/login">
            Back to sign in
          </a>
        </div>
      </div>
    </div>
  );
}
