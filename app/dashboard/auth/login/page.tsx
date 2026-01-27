'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { loginSchema } from '@/lib/shared/validators';
import { useAuth } from '@/app/auth/AuthProvider';

export default function DashboardLoginPage() {
	const router = useRouter();
	const { signIn } = useAuth();
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({ email: '', password: '' });

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			loginSchema.parse(formData);

			const { error } = await signIn(formData.email, formData.password);

			if (error) throw error;

			toast.success('Signed in');
			router.push('/dashboard');
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Login failed';
			toast.error(message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-950 flex items-center justify-center p-4">
			<div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-8">
				<h1 className="text-3xl font-black mb-2 text-white">Welcome back</h1>
				<p className="text-slate-400 mb-6">Sign in to AFGHCO Logistics</p>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-slate-300 font-semibold mb-2">Email</label>
						<input
							type="email"
							value={formData.email}
							onChange={(e) => setFormData({ ...formData, email: e.target.value })}
							className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="name@example.com"
							autoComplete="email"
						/>
					</div>

					<div>
						<label className="block text-slate-300 font-semibold mb-2">Password</label>
						<input
							type="password"
							value={formData.password}
							onChange={(e) => setFormData({ ...formData, password: e.target.value })}
							className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="••••••••"
							autoComplete="current-password"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-bold py-3 rounded-lg transition"
					>
						{loading ? 'Signing in…' : 'Sign in'}
					</button>
				</form>

				<div className="mt-6 text-sm text-slate-400 flex items-center justify-between">
					<a className="text-blue-400 hover:text-blue-300" href="/dashboard/auth/reset">
						Forgot password?
					</a>
					<a className="text-blue-400 hover:text-blue-300" href="/dashboard/auth/register">
						Create account
					</a>
				</div>
			</div>
		</div>
	);
}

