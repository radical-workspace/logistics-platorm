import Header from '@/app/composer/Header';
import Footer from '@/app/components/Footer';
import ClientImage from '@/app/components/ClientImage';
import Link from 'next/link';

const timeline = [
  {
    year: '2008',
    title: 'Founded in Kabul',
    copy: 'Established to provide secure freight and ground handling within Afghanistan.',
  },
  {
    year: '2015',
    title: 'Regional expansion',
    copy: 'Built air and sea freight corridors through Doha, Dubai, and Istanbul with bonded partners.',
  },
  {
    year: '2022',
    title: 'Platform launch',
    copy: 'Introduced the digital control tower for telemetry, approvals, and partner collaboration.',
  },
];

export default function CompanyPage() {
  return (
    <>
      <Header />
      <main className="bg-slate-950 text-slate-100 min-h-screen pt-20 sm:pt-24">
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(56,189,248,0.12),transparent_35%),#0f172a]"></div>
          <div className="relative max-w-5xl mx-auto px-6 py-16 sm:py-20 text-center">
            <p className="text-xs uppercase tracking-[0.45em] text-slate-500">Company</p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-black leading-tight">Afghanistan-first logistics with global grade standards.</h1>
            <p className="mt-4 text-lg text-slate-300 max-w-3xl mx-auto">
              We are operators, logisticians, engineers, and security professionals delivering predictable supply chains in complex environments. Every lane is built with compliance, resilience, and transparency.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="/contact" className="px-5 py-3 rounded-full bg-blue-600 hover:bg-blue-700 font-semibold shadow-lg">Talk to leadership</Link>
              <Link href="/platform" className="px-5 py-3 rounded-full border border-slate-700 hover:border-slate-500 font-semibold text-slate-100">View platform</Link>
            </div>
          </div>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-12 grid gap-8 lg:grid-cols-[1.1fr_0.9fr] items-start">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6 shadow-lg">
            <h3 className="text-2xl font-black">Leadership and stewardship</h3>
            <p className="mt-3 text-slate-300 text-sm leading-relaxed">
              Our leadership team blends Afghan and international experience across aviation security, freight forwarding, humanitarian logistics, and software engineering. Decision makers remain close to the field and remain accessible to clients.
            </p>
            <ul className="mt-4 space-y-2 text-sm text-slate-300">
              <li>On-ground directors in Kabul with direct lines to operations centres.</li>
              <li>Safety and compliance officers certified in aviation and dangerous goods handling.</li>
              <li>Product and engineering leads dedicated to integrations and telemetry reliability.</li>
            </ul>
          </div>
          <ClientImage
            src="/hero-company.jpg"
            alt="AFGHCO Company Hero"
            className="w-full h-full object-cover rounded-2xl border border-slate-800 shadow-xl"
            priority
          />
                <section className="py-24 bg-slate-900">
                  <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
                    {/* Text */}
                    <div>
                      <h2 className="text-3xl font-black mb-6">About AFGHCO</h2>
                      <p className="text-slate-300 text-lg leading-relaxed mb-8">
                        Afghanistan’s enterprise logistics backbone, operating with integrity, compliance, and precision since 2008.
                      </p>
                      <ul className="space-y-4 text-slate-400">
                        <li>• Kabul HQ</li>
                        <li>• Regional coverage</li>
                        <li>• ISO 9001 certified</li>
                        <li>• UNGM registered</li>
                      </ul>
                    </div>
                    {/* Image */}
                    <ClientImage
                      src="/og-company-1.jpg"
                      alt="Company HQ"
                      className="rounded-2xl shadow-xl"
                    />
                  </div>
                </section>
        </section>

        <section className="max-w-6xl mx-auto px-6 py-12 grid gap-6 md:grid-cols-3">
          {timeline.map((item) => (
            <div key={item.year} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <p className="text-xs uppercase tracking-[0.35em] text-slate-500">{item.year}</p>
              <h4 className="mt-2 text-lg font-semibold text-slate-100">{item.title}</h4>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{item.copy}</p>
            </div>
          ))}
        </section>

        <section className="max-w-6xl mx-auto px-6 py-12 grid gap-8 lg:grid-cols-[1.05fr_0.95fr] items-start">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h3 className="text-2xl font-black">Footprint and partners</h3>
            <p className="mt-3 text-slate-300 text-sm leading-relaxed">
              We maintain bonded warehouse capacity at Kabul International Airport and partner facilities across Kandahar and Mazar. Regional freight nodes are supported via Doha, Dubai, Istanbul, and Almaty. Security-vetted road partners maintain convoys through Torkham and Spin Boldak.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h3 className="text-2xl font-black">Certifications and assurance</h3>
            <p className="mt-3 text-slate-300 text-sm leading-relaxed">
              ISO 9001 quality management, ICAO Annex 17 aviation security, UNGM vendor registration, and Afghan Civil Aviation Authority bonded warehouse operator status anchor our assurance programme.
            </p>
            <p className="mt-3 text-slate-400 text-sm">Documentation and attestations are available upon request.</p>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
