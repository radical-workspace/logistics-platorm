import Link from 'next/link';
import Header from '@/app/composer/Header';
import Footer from '@/app/components/Footer';
import ClientImage from '@/app/components/ClientImage';

const featureCards = [
  {
    title: 'Live telemetry',
    description: 'Milestone-driven feeds with location, status, and variance detection streamed into your dashboard.',
  },
  {
    title: 'Compliance automation',
    description: 'Document vaults, approvals, and audit trails aligned to aviation and customs requirements.',
  },
  {
    title: 'Integrations',
    description: 'REST, webhooks, and EDI connectors for ERPs, donor reporting, and partner systems.',
  },
  {
    title: 'Collaboration',
    description: 'Role-based workspaces for ops, finance, and security with comment threads and handover notes.',
  },
];

export default function PlatformPage() {
  return (
    <>
      <Header />
      <main className="bg-slate-950 text-slate-100 min-h-screen pt-20 sm:pt-24">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(56,189,248,0.1),transparent),linear-gradient(225deg,rgba(14,165,233,0.08),transparent),#0f172a]"></div>
          <div className="relative max-w-6xl mx-auto px-6 py-16 sm:py-20 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-center">
            <div>
              <p className="text-xs uppercase tracking-[0.45em] text-slate-500">Platform</p>
              <h1 className="mt-3 text-4xl sm:text-5xl font-black leading-tight">Visibility, control, and integration in one control tower.</h1>
              <p className="mt-4 text-lg text-slate-300 max-w-3xl">
                The AFGHCO client workspace merges live telemetry, compliance workflows, and collaboration into a single pane. Track consignments, approve documents, and brief stakeholders without leaving the console.
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <Link href="/dashboard/auth/login" className="px-5 py-3 rounded-full bg-blue-600 hover:bg-blue-700 font-semibold shadow-lg">Open client login</Link>
                <Link href="/contact" className="px-5 py-3 rounded-full border border-slate-700 hover:border-slate-500 font-semibold text-slate-100">Book a platform demo</Link>
              </div>
            </div>
            <ClientImage
              src="/hero-platform.jpg"
              alt="AFGHCO Platform Hero"
              className="w-full h-full object-cover rounded-2xl border border-slate-800 shadow-xl"
              priority
            />
                  <section className="py-24 bg-slate-900">
                    <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
                      {/* Text */}
                      <div>
                        <h2 className="text-3xl font-black mb-6">Telemetry & Control</h2>
                        <p className="text-slate-300 text-lg leading-relaxed mb-8">
                          Real-time shipment tracking, compliance automation, and client workspace controls.
                        </p>
                        <ul className="space-y-4 text-slate-400">
                          <li>• Live map tracking</li>
                          <li>• EDI connectors</li>
                          <li>• Compliance automation</li>
                          <li>• Client workspace controls</li>
                        </ul>
                      </div>
                      {/* Image */}
                      <ClientImage
                        src="/og-platform-1.jpg"
                        alt="Platform Telemetry"
                        className="rounded-2xl shadow-xl"
                      />
                    </div>
                  </section>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-12 grid gap-6 md:grid-cols-2 lg:grid-cols-4">
          {featureCards.map((card) => (
            <div key={card.title} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-lg">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Feature</p>
              <h3 className="mt-2 text-lg font-semibold text-slate-100">{card.title}</h3>
              <p className="mt-2 text-slate-300 text-sm leading-relaxed">{card.description}</p>
            </div>
          ))}
        </section>

        <section className="max-w-6xl mx-auto px-6 py-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h3 className="text-2xl font-black">Data and integrations</h3>
            <p className="mt-3 text-slate-300 text-sm leading-relaxed">
              Pull data into your ecosystem with REST endpoints, webhook notifications, and export jobs. Standard payloads cover shipments, milestones, events, documents, and SLA performance. Role-based API keys and audit logging keep access in check.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>Standard JSON schemas with test harnesses and example calls.</li>
              <li>Webhook retries with signing secrets for security teams.</li>
              <li>CSV exports for donor reporting and finance reconciliation.</li>
            </ul>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h3 className="text-2xl font-black">Governance and controls</h3>
            <p className="mt-3 text-slate-300 text-sm leading-relaxed">
              Permissions are scoped by workspace and role. Approvals, document vaulting, and escalation paths are built-in. Every change is stamped with user, time, and action to satisfy audit expectations.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-200">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="font-semibold">Approvals</p>
                <p className="text-slate-400 mt-1">Multi-step approvals for customs dossiers, route changes, and handovers.</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="font-semibold">Escalations</p>
                <p className="text-slate-400 mt-1">Variance alerts with playbooks and notification channels for ops and leadership.</p>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
