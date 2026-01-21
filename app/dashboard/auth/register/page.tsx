'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import toast from 'react-hot-toast';
import { supabase } from '@/lib/supabaseclient';
import { registerSchema } from '@/lib/validators';

export default function DashboardRegisterPage() {
	const router = useRouter();
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		email: '',
		password: '',
		display_name: '',
	});

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		setLoading(true);

		try {
			registerSchema.parse(formData);

			const { error } = await supabase.auth.signUp({
				email: formData.email,
				password: formData.password,
				options: {
					data: { display_name: formData.display_name },
					emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
				},
			});

			if (error) throw error;

			toast.success('Check your email to confirm sign up');
			router.push('/dashboard/auth/login');
		} catch (err: unknown) {
			const message = err instanceof Error ? err.message : 'Registration failed';
			toast.error(message);
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className="min-h-screen bg-linear-to-br from-slate-900 to-slate-950 flex items-center justify-center p-4">
			<div className="w-full max-w-md bg-slate-800 rounded-2xl shadow-xl border border-slate-700 p-8">
				<h1 className="text-3xl font-black mb-2 text-white">Create account</h1>
				<p className="text-slate-400 mb-6">Join AFGHCO Logistics</p>

				<form onSubmit={handleSubmit} className="space-y-4">
					<div>
						<label className="block text-slate-300 font-semibold mb-2">Full name</label>
						<input
							type="text"
							value={formData.display_name}
							onChange={(e) => setFormData({ ...formData, display_name: e.target.value })}
							className="w-full px-4 py-3 bg-slate-700 text-white rounded-lg border border-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500"
							placeholder="John Doe"
							autoComplete="name"
						/>
					</div>

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
							autoComplete="new-password"
						/>
					</div>

					<button
						type="submit"
						disabled={loading}
						className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-600 text-white font-bold py-3 rounded-lg transition"
					>
						{loading ? 'Creating…' : 'Create account'}
					</button>
				</form>

				<div className="mt-6 text-sm text-slate-400 flex items-center justify-between">
					<a className="text-blue-400 hover:text-blue-300" href="/dashboard/auth/login">
						Already have an account?
					</a>
				</div>
			</div>
		</div>
	);
}
