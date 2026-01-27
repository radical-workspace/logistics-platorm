import Link from 'next/link';
import { Suspense } from 'react';
import Header from '@/app/composer/Header';
import ClientImage from '@/app/components/ClientImage';
import HomeTrackingPreview from '@/app/components/HomeTrackingPreview';
import TrackingForm from '@/app/components/TrackingForm';
import Footer from '@/app/components/Footer';

export default function Page() {
  return (
    <>
      <Header />
      <main>
        {/* HERO */}
        <section
          className="relative overflow-hidden min-h-[min(92vh,880px)] pt-[clamp(96px,14vh,160px)] pb-16 px-[clamp(24px,6vw,96px)] grid items-center grid-cols-[5fr_7fr]"
        >
          {/* Left: Text */}
          <div className="z-10 flex flex-col max-w-xl">
            <div className="mb-5">
              <span className="inline-block rounded-full bg-white/10 px-5 py-2 text-[13px] uppercase tracking-[0.28em] font-semibold text-white/85">AFGHANISTAN TO THE WORLD</span>
            </div>
            <h1 className="font-extrabold text-white mb-7 text-[clamp(44px,5.2vw,68px)] leading-[1.08] max-w-[12ch] text-left">
              Integrated logistics<br />from Kabul to the<br />globe.
            </h1>
            <p className="mb-10 text-white/85 text-[18px] leading-[1.55] max-w-[48ch] text-left">
              Secure air, land, and humanitarian freight operations with real-time visibility and compliance.
            </p>
            <div className="flex gap-4 mb-10">
              <Link
                href="/contact"
                className="inline-flex items-center justify-center h-12 px-7 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-semibold text-[17px] shadow-lg"
              >
                Talk to operations
              </Link>
              <Link
                href="/tracking"
                className="inline-flex items-center justify-center h-12 px-7 rounded-full border border-blue-600 text-blue-100 hover:border-blue-400 font-semibold text-[17px] opacity-[0.85]"
              >
                Track a shipment
              </Link>
            </div>
          </div>
          {/* Right: Image */}
          <div className="absolute inset-0 right-0 w-full h-full z-0">
            <ClientImage
              src="/hero-home.jpg"
              alt="AFGHCO Logistics Hero"
              className="w-full h-full object-cover object-center contrast-125 saturate-125 brightness-110"
            />
            <div className="absolute inset-0 bg-linear-to-r from-slate-950/90 via-slate-950/65 to-slate-950/45 pointer-events-none" />
            <div className="absolute inset-0 bg-linear-to-tr from-blue-600/20 via-transparent to-transparent pointer-events-none" />
          </div>
        </section>
        <section id="about" className="py-24 bg-slate-900">
          <div className="max-w-5xl mx-auto px-6 text-center">
            <h2 className="text-3xl sm:text-4xl font-black mb-8">About AFGHCO</h2>
            <p className="text-slate-300 text-lg leading-relaxed max-w-3xl mx-auto">
              AFGHCO Shipping & Logistics is Afghanistan’s enterprise logistics backbone. We specialize in high-risk environments, international freight, and mission-critical supply chains for governments, NGOs, and corporations.
            </p>
            <p className="mt-8 text-slate-400 text-lg">
              Operating with integrity, compliance, and precision since 2008.
            </p>
          </div>
        </section>

        {/* Warehousing */}
        <section id="warehousing" className="py-24 bg-slate-950">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <h2 className="text-3xl sm:text-4xl lg:text-5xl font-black mb-6">Secure Warehousing</h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-8">
                Our warehousing infrastructure supports bonded storage, inventory control, and rapid dispatch under high-security conditions.
              </p>
              <ul className="space-y-4 text-slate-400">
                <li>• Bonded & non-bonded facilities</li>
                <li>• 24/7 monitored storage</li>
                <li>• Inventory & fulfillment services</li>
                <li>• Rapid last-mile dispatch</li>
              </ul>
            </div>
            {/* Image */}
            <ClientImage
              src="/og-platform-1.jpg"
              alt="Warehousing Facility"
              className="rounded-2xl shadow-xl"
            />
          </div>
        </section>

        {/* Global Freight */}
        <section id="global-freight" className="py-24 bg-slate-900">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
            {/* Image */}
            <ClientImage
              src="/og-solutions-1.jpg"
              alt="Global Freight Shipping"
              className="rounded-2xl shadow-xl"
            />
            {/* Text */}
            <div>
              <h2 className="text-4xl font-black mb-6">Global Freight Network</h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-8">
                We operate air, sea, and land freight solutions linking Afghanistan to global trade hubs including the Middle East, Europe, and Asia.
              </p>
              <ul className="space-y-3 text-slate-400">
                <li>• International air freight priority lanes</li>
                <li>• Sea cargo consolidation & deconsolidation</li>
                <li>• Cross-border trucking corridors</li>
                <li>• Humanitarian & government logistics</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Supply Chain */}
        <section id="supply-chain" className="py-24 bg-slate-950">
          <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
            {/* Text */}
            <div>
              <h2 className="text-4xl sm:text-4xl lg:text-5xl font-black mb-6">Integrated Supply Chain</h2>
              <p className="text-slate-300 text-lg leading-relaxed mb-8">
                AFGHCO delivers end-to-end supply chain orchestration across Afghanistan and international corridors. From procurement to final delivery, we provide full visibility, risk mitigation, and compliance-driven execution.
              </p>
              <ul className="space-y-3 text-slate-400">
                <li>• End-to-end shipment visibility</li>
                <li>• Customs & regulatory coordination</li>
                <li>• Secure inland transportation</li>
                <li>• Enterprise SLA management</li>
              </ul>
            </div>
            {/* Image */}
            <ClientImage
              src="/illustration-integrated-flow.png"
              alt="Supply Chain Management"
              className="rounded-2xl shadow-xl"
            />
          </div>
        </section>

        {/* Capabilities */}
        <section id="capabilities" className="py-24 bg-slate-900">
          <div className="max-w-7xl mx-auto px-6">
            <h2 className="text-3xl sm:text-4xl font-black text-center">Core Capabilities</h2>
            <p className="mt-4 text-slate-400 text-center max-w-3xl mx-auto">
              Mission-ready logistics for humanitarian, government, and commercial lanes. Our command centre synchronises ground handlers, airlift assets, and inland convoys through a single pane of glass.
            </p>
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[{
                title: 'Command & control',
                description: '24/7 network operations centre coordinating airlift slots, customs brokers, and provincial security partners.',
              }, {
                title: 'Compliance & governance',
                description: 'ITAR, UNHAS, and ICAO-aligned workflows with complete audit trails and document vaulting.',
              }, {
                title: 'Humanitarian corridors',
                description: 'Rapid response capability for medical, food, and critical infrastructure cargo through secure green lanes.',
              }].map((card) => (
                <div key={card.title} className="rounded-2xl border border-slate-800 bg-slate-950/80 p-6">
                  <h3 className="text-xl font-semibold text-slate-100">{card.title}</h3>
                  <p className="mt-3 text-slate-400 text-sm leading-relaxed">{card.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Governance */}
        <section id="governance" className="py-24 bg-slate-950">
          <div className="max-w-6xl mx-auto px-6 grid lg:grid-cols-2 gap-12 items-start">
            <div className="rounded-3xl border border-slate-800 bg-slate-900/80 p-8">
              <h3 className="text-2xl font-black text-slate-100">Governance & Certifications</h3>
              <ul className="mt-5 space-y-3 text-slate-300 text-sm leading-relaxed">
                <li>• ISO 9001 quality management with Kabul-based audit team</li>
                <li>• ICAO Annex 17 compliant aviation security programme</li>
                <li>• UNGM registered vendor for humanitarian air services</li>
                <li>• Afghan Civil Aviation Authority bonded warehouse operator</li>
              </ul>
            </div>
            <div className="rounded-3xl border border-slate-800 bg-slate-900/60 p-8">
              <h3 className="text-2xl font-black text-slate-100">Regional coverage</h3>
              <p className="mt-3 text-slate-300 text-sm leading-relaxed">
                AFGHCO leverages strategic gateways in Kabul, Kandahar, Mazar-e-Sharif, Doha, Dubai, Istanbul, and Almaty. Road convoys connect through Torkham and Spin Boldak for expedited cross-border clearance.
              </p>
              <p className="mt-4 text-slate-400 text-sm">
                Dedicated account stewards coordinate mission-specific routing, force protection, and diplomatic overflight requirements.
              </p>
            </div>
          </div>
        </section>

        {/* Enterprise routes */}
        <section className="py-24 bg-slate-900">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.4em] text-slate-500">Mission control</p>
                <h3 className="text-3xl sm:text-4xl font-black text-slate-100">Choose your path to go-live</h3>
                <p className="mt-2 text-slate-400 max-w-2xl">
                  Dedicated pages for stakeholders to act fast: solution buyers, platform integrators, and field ops teams can each enter through the lane built for them.
                </p>
              </div>
              <Link
                href="/contact"
                className="inline-flex items-center justify-center px-5 py-3 rounded-full bg-blue-600 hover:bg-blue-700 text-white font-bold shadow-lg"
              >
                Talk to operations
              </Link>
            </div>

            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {[{
                title: 'Solutions desk',
                body: 'See air, sea, land, warehousing, and humanitarian playbooks with SLAs and coverage maps.',
                href: '/solutions',
                action: 'View solutions',
              }, {
                title: 'Platform overview',
                body: 'Understand telemetry, EDI connectors, compliance automation, and client workspace controls.',
                href: '/platform',
                action: 'Open platform page',
              }, {
                title: 'Engage operations',
                body: 'Book a mobilisation workshop, request onboarding, or raise an RFP with guaranteed response times.',
                href: '/contact',
                action: 'Go to contact',
              }].map((card) => (
                <Link
                  key={card.title}
                  href={card.href}
                  className="group block rounded-2xl border border-slate-800 bg-slate-950/70 p-6 hover:border-blue-500 transition shadow-lg"
                >
                  <div className="flex items-center justify-between gap-3">
                    <h4 className="text-xl font-semibold text-slate-100">{card.title}</h4>
                    <span className="text-xs uppercase tracking-[0.25em] text-slate-500 group-hover:text-blue-300">Go</span>
                  </div>
                  <p className="mt-3 text-slate-400 text-sm leading-relaxed">{card.body}</p>
                  <p className="mt-4 text-sm font-bold text-blue-400 group-hover:text-blue-300">{card.action}</p>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* Tracking Preview */}
        <section id="tracking" className="py-24 bg-slate-950">
          <div className="max-w-7xl mx-auto px-6">
            <div className="bg-slate-900 rounded-2xl p-8 border border-slate-800">
              <h3 className="text-2xl font-black mb-4">Live Tracking Preview</h3>
              <TrackingForm />
              <Suspense fallback={<p className="text-slate-400">Loading tracking preview…</p>}>
                <HomeTrackingPreview />
              </Suspense>
              <p className="mt-6 text-slate-400 text-sm">
                Need bespoke dashboards or EDI integration? Our engineering team delivers custom control towers, ERP interfaces, and secure partner data feeds for multinational programmes.
              </p>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
