import Link from 'next/link';
import Image from 'next/image';
import Header from '@/app/composer/Header';
import Footer from '@/app/components/Footer';
import ClientImage from '@/app/components/ClientImage';

export default function ContactPage() {
  return (
    <>
      <Header />
      <main className="bg-slate-950 text-slate-100 min-h-screen pt-20 sm:pt-24">
        {/* IMAGE TEST SNIPPET BELOW */}
        <div className="flex justify-center my-8">
          <Image
            src="/illustration-integrated-flow.png"
            width={300}
            height={300}
            className="border-2 border-red-600"
            alt="test"
          />
        </div>
        {/* ...existing code... */}
        <section className="relative overflow-hidden">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_15%_20%,rgba(37,99,235,0.2),transparent_35%),#0f172a]"></div>
          <div className="relative max-w-4xl mx-auto px-6 py-16 sm:py-20 text-center">
            <ClientImage
              src="/hero-contact.jpg"
              alt="AFGHCO Contact Hero"
              className="absolute inset-0 w-full h-full object-cover opacity-70"
              priority
            />
            <section className="py-24 bg-slate-900">
              <div className="max-w-7xl mx-auto px-6 grid md:grid-cols-2 gap-12 items-center">
                {/* Text */}
                <div>
                  <h2 className="text-3xl font-black mb-6">Workspace creation, user roles, and integration walk-through with live data.</h2>
                  <p className="text-slate-300 text-lg leading-relaxed mb-8">
                    Reach out to our team for onboarding, support, or partnership opportunities.
                  </p>
                  <ul className="space-y-4 text-slate-400">
                    <li>• Onboarding</li>
                    <li>• Support</li>
                    <li>• Partnerships</li>
                    <li>• Media inquiries</li>
                  </ul>
                </div>
                {/* Image */}
                <ClientImage
                  src="/og-contact-1.jpg"
                  alt="Contact Team"
                  className="rounded-2xl shadow-xl"
                />
              </div>
            </section>
            <p className="text-xs uppercase tracking-[0.45em] text-slate-500">Contact</p>
            <h1 className="mt-3 text-4xl sm:text-5xl font-black leading-tight">Talk with the operations desk.</h1>
            <p className="mt-4 text-lg text-slate-300">
              Whether you need an RFP response, mobilisation workshop, or urgent uplift, our team responds within one business day. Emergency desk operates 24/7.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Link href="mailto:ops@afghco.com" className="px-5 py-3 rounded-full bg-blue-600 hover:bg-blue-700 font-semibold shadow-lg">Email ops@afghco.com</Link>
              <Link href="tel:+93202101111" className="px-5 py-3 rounded-full border border-slate-700 hover:border-slate-500 font-semibold text-slate-100">Call +93 (0)20 210 1111</Link>
            </div>
          </div>
        </section>

        <section className="max-w-5xl mx-auto px-6 py-12 grid gap-6 md:grid-cols-3">
          {[{
            title: 'Mobilisation workshop',
            detail: 'Route design, SLA definition, and compliance pack in a 60 minute session.',
          }, {
            title: 'Client onboarding',
            detail: 'Workspace creation, user roles, and integration walk-through with live data.',
          }, {
            title: 'Emergency desk',
            detail: '24/7 escalation for active consignments and humanitarian movements.',
          }].map((item) => (
            <div key={item.title} className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5">
              <h3 className="text-lg font-semibold text-slate-100">{item.title}</h3>
              <p className="mt-2 text-sm text-slate-300 leading-relaxed">{item.detail}</p>
            </div>
          ))}
        </section>

        <section className="max-w-5xl mx-auto px-6 pb-16">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/80 p-6">
            <h3 className="text-2xl font-black">Response times</h3>
            <ul className="mt-4 space-y-2 text-sm text-slate-300 leading-relaxed">
              <li>RFPs and new business: response within 1 business day.</li>
              <li>Current client tickets: response within 2 business hours.</li>
              <li>Emergency desk: immediate triage via phone or email.</li>
            </ul>
            <div className="mt-5 flex flex-wrap gap-3">
              <Link href="/platform" className="px-4 py-2 rounded-full bg-blue-600 hover:bg-blue-700 font-semibold text-white">Platform overview</Link>
              <Link href="/solutions" className="px-4 py-2 rounded-full border border-slate-700 hover:border-slate-500 font-semibold text-slate-100">View solutions</Link>
              <Link href="/dashboard/auth/login" className="px-4 py-2 rounded-full border border-slate-700 hover:border-slate-500 font-semibold text-slate-100">Client login</Link>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  );
}
