import Link from 'next/link';
import Header from '@/app/composer/Header';
import Footer from '@/app/components/Footer';
import ClientImage from '@/app/components/ClientImage';

const solutionCards = [
  {
    id: 'supply-chain',
    title: 'Supply chain control',
    body: 'End-to-end orchestration from purchase order through final mile with milestone validation and SLA-backed alerts.',
    bullets: [
      'Purchase order capture and vendor booking',
      'Risk and compliance gating with approvals',
      'Live milestone telemetry and exception flows',
    ],
  },
  {
    id: 'freight',
    title: 'Air, sea, and land freight',
    body: 'Priority airlift lanes, port partnerships, and cross-border trucking corridors connecting Afghanistan to global hubs.',
    bullets: [
      'IATA agents and port consolidation partners',
      'Transit risk intelligence and re-routing playbooks',
      'Government and NGO humanitarian corridor support',
    ],
  },
  {
    id: 'warehousing',
    title: 'Secure warehousing',
    body: 'Bonded and non-bonded facilities with inventory control, cold-chain validation, and rapid dispatch.',
    bullets: [
      '24/7 monitored compounds and bonded storage',
      'Inventory accuracy with cycle counts and serial capture',
      'Staging, kitting, and last-mile dispatch within SLA',
    ],
  },
  {
    id: 'humanitarian',
    title: 'Humanitarian and resilience',
    body: 'Mission-ready corridors for relief, medical, and infrastructure cargo with vetted partners and transparent reporting.',
    bullets: [
      'UNHAS aligned workflows and customs pre-clearance',
      'Green-lane documentation packs and force protection liaison',
      'After-action reporting with audit trails and cost transparency',
    ],
  },
];

export default function SolutionsPage() {
  return (
    <>
      <Header />
      <main className="bg-slate-950 text-slate-100 min-h-screen pt-20 sm:pt-24">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_20%_20%,rgba(14,165,233,0.15),transparent_35%),radial-gradient(circle_at_80%_0%,rgba(59,130,246,0.12),transparent_30%),#0f172a]"></div>
           <div className="relative max-w-6xl mx-auto px-6 py-16 sm:py-20">
            <ClientImage
              src="/hero-solutions.jpg"
              alt="AFGHCO Solutions Hero"
              className="absolute inset-0 w-full h-full object-cover opacity-70"
              priority
            />
            <p className="text-xs uppercase tracking-[0.45em] text-slate-500">Solutions desk</p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-black leading-tight">Built-for-Afghanistan logistics, delivered globally.</h1>
            <p className="mt-4 text-lg text-slate-300 max-w-3xl">
              Choose the lane you need: bonded warehousing in Kabul, multi-modal freight to Istanbul or Dubai, inland convoys to provincial hubs, or humanitarian green lanes. Each playbook comes with SLAs, operators, and telemetry baked in.
            </p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Link href="#supply-chain" className="px-5 py-3 rounded-full bg-blue-600 hover:bg-blue-700 font-semibold shadow-lg">Explore playbooks</Link>
              <Link href="/contact" className="px-5 py-3 rounded-full border border-slate-700 hover:border-slate-500 font-semibold text-slate-100">Book a mobilisation call</Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-12 grid gap-6 md:grid-cols-2">
          <ClientImage
            src="https://images.unsplash.com/photo-1586528116311-ad8dd3c8310d?auto=format&fit=crop&w=1200&q=80"
            alt="Air freight at night"
            className="w-full h-full object-cover rounded-2xl border border-slate-800 shadow-xl"
          />
          <div className="bg-slate-900/70 border border-slate-800 rounded-2xl p-6 shadow-xl">
            <h2 className="text-2xl font-black">Execution that matches the brief</h2>
            <p className="mt-3 text-slate-300 text-sm leading-relaxed">
              Each movement is built against a documented plan: route design, customs dossier, escalation matrix, and telematics requirements. Ops crews, security partners, and warehouse teams share the same playbook so execution matches the promise.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-300">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">SLA governance</p>
                <p className="mt-2">Time-bound milestones with exception handling and after-action reports.</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="text-xs uppercase tracking-[0.35em] text-slate-500">Coverage</p>
                <p className="mt-2">Kabul, Kandahar, Mazar, Doha, Dubai, Istanbul, Almaty, and corridor partners.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="max-w-7xl mx-auto px-6 py-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {solutionCards.map((card) => (
            <div key={card.title} id={card.id} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{card.id}</p>
              <h3 className="mt-2 text-xl font-semibold text-slate-100">{card.title}</h3>
              <p className="mt-2 text-slate-300 text-sm leading-relaxed">{card.body}</p>
              <ul className="mt-4 space-y-2 text-sm text-slate-300">
                {card.bullets.map((item) => (
                  <li key={item} className="flex gap-2">
                    <span className="mt-1 h-2 w-2 rounded-full bg-blue-400"></span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </section>

          <section className="py-24 bg-slate-900">
            <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
              {/* Text */}
              <div>
                <h2 className="text-3xl font-black mb-6">Air, Sea, Land, Humanitarian</h2>
                <p className="text-slate-300 text-lg leading-relaxed mb-8">
                  Our playbooks cover every mode and mission, from bonded air freight to last-mile humanitarian delivery.
                </p>
                <ul className="space-y-4 text-slate-400">
                  <li>• Air freight corridors</li>
                  <li>• Sea cargo consolidation</li>
                  <li>• Cross-border trucking</li>
                  <li>• Humanitarian logistics</li>
                </ul>
              </div>
              {/* Image */}
              <ClientImage
                src="/og-solutions-1.jpg"
                alt="Air Freight"
                className="rounded-2xl shadow-xl"
              />
            </div>
          </section>

          <section className="py-24 bg-slate-950">
            <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
              {/* Image */}
              <ClientImage
                src="/og-solutions-2.jpg"
                alt="Humanitarian Logistics"
                className="rounded-2xl shadow-xl"
              />
              {/* Text */}
              <div>
                <h2 className="text-3xl font-black mb-6">Mission-Ready Humanitarian</h2>
                <p className="text-slate-300 text-lg leading-relaxed mb-8">
                  We deliver for NGOs, governments, and multilateral agencies in the world’s most challenging environments.
                </p>
                <ul className="space-y-4 text-slate-400">
                  <li>• Emergency response</li>
                  <li>• Secure supply chain</li>
                  <li>• Compliance & reporting</li>
                </ul>
              </div>
            </div>
          </section>
        <section className="max-w-6xl mx-auto px-6 py-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h3 className="text-2xl font-black">Deployment timelines</h3>
            <p className="mt-3 text-slate-300 text-sm leading-relaxed">
              Quick-start templates get you live fast: a single lane can be operational in days; multi-country programmes follow a two-week mobilisation with testing, documentation, and comms protocols.
            </p>
            <div className="mt-4 grid gap-3 sm:grid-cols-2 text-sm text-slate-200">
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="font-semibold">Express lane</p>
                <p className="text-slate-400 mt-1">48-72 hours with standard SOPs, vetted partners, and live tracking.</p>
              </div>
              <div className="rounded-xl border border-slate-800 bg-slate-950 p-4">
                <p className="font-semibold">Programme onboarding</p>
                <p className="text-slate-400 mt-1">Two-week mobilisation with drills, integrations, and resiliency checks.</p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h3 className="text-2xl font-black">Who we serve</h3>
            <ul className="mt-4 space-y-3 text-slate-300 text-sm leading-relaxed">
              <li>Government agencies and diplomatic missions needing bonded handling and security liaison.</li>
              <li>NGOs and multilateral organisations moving relief, medical, and critical infrastructure cargo.</li>
              <li>Commercial shippers requiring predictable corridors, customs stewardship, and SLA discipline.</li>
            </ul>
            <Link href="/contact" className="inline-flex mt-5 px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 font-semibold text-white">Engage our team</Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
