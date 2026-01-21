'use client';

import { useState } from 'react';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseclient';
import { passwordResetSchema } from '@/lib/validators';

export default function ResetPasswordPage() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      passwordResetSchema.parse({ email });

      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/update-password`,
      });

      if (error) throw error;
      toast.success('Password reset email sent');
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to send reset email';
      toast.error(message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-8">
        <h1 className="text-3xl font-black mb-2 text-white">Reset password</h1>
        <p className="text-slate-400 mb-6">We’ll email you a recovery link.</p>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-slate-300 font-semibold mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="name@example.com"
              autoComplete="email"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-bold py-3 rounded-lg transition"
          >
            {loading ? 'Sending…' : 'Send reset email'}
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
