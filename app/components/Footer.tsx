import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-slate-950 border-t border-slate-800">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-10">
        <div className="grid gap-8 lg:grid-cols-[1.2fr_1fr_1fr]">
          <div>
            <div className="font-black tracking-wide text-slate-100">AFGHCO</div>
            <div className="text-xs tracking-widest text-blue-400 mt-1">LOGISTICS</div>
            <p className="mt-4 text-slate-400 text-sm max-w-md">
              Afghanistan&rsquo;s sovereign logistics partner delivering global freight orchestration, bonded warehousing,
              and real-time situational awareness for government, NGO, and commercial programmes.
            </p>
            <p className="mt-4 text-slate-500 text-xs uppercase tracking-[0.3em]">Network Operations Centre</p>
            <p className="text-slate-300 text-sm mt-2">Kabul International Airport, Air Cargo Village</p>
            <p className="text-slate-300 text-sm">ops@afghco.com · +93 (0)20 210 1111</p>
          </div>

          <div className="grid grid-cols-2 gap-x-10 gap-y-6 text-sm text-slate-300">
            <div className="space-y-2">
              <p className="text-slate-400 font-semibold">Company</p>
              <Link className="block hover:text-white" href="/">Home</Link>
              <Link className="block hover:text-white" href="/company">About</Link>
              <Link className="block hover:text-white" href="/contact">Contact</Link>
              <Link className="block hover:text-white" href="/platform">Platform</Link>
              <Link className="block hover:text-white" href="/dashboard/auth/login">Client login</Link>
            </div>
            <div className="space-y-2">
              <p className="text-slate-400 font-semibold">Solutions</p>
              <Link className="block hover:text-white" href="/solutions#supply-chain">Supply chain control</Link>
              <Link className="block hover:text-white" href="/solutions#freight">Air, sea, land freight</Link>
              <Link className="block hover:text-white" href="/solutions#warehousing">Secure warehousing</Link>
              <Link className="block hover:text-white" href="/tracking">Track a shipment</Link>
            </div>
            <div className="space-y-2">
              <p className="text-slate-400 font-semibold">Compliance</p>
              <p className="text-slate-400">ISO 9001</p>
              <p className="text-slate-400">ICAO Annex 17</p>
              <p className="text-slate-400">UNGM vendor #457890</p>
            </div>
            <div className="space-y-2">
              <p className="text-slate-400 font-semibold">Rapid response</p>
              <p className="text-slate-300">Emergency desk</p>
              <p className="text-slate-400">crisis@afghco.com</p>
              <p className="text-slate-400">+93 (0)20 210 1199</p>
            </div>
          </div>
        </div>

        <div className="mt-10 pt-6 border-t border-slate-800 text-xs text-slate-500 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div>© {new Date().getFullYear()} AFGHCO. All rights reserved.</div>
          <div className="text-slate-600">Built with Next.js + Supabase</div>
        </div>
      </div>
    </footer>
  );
}
