"use client";

function Feature({ title, description }: { title: string; description: string }) {
  return (
    <div className="bg-white/5 border border-white/10 rounded-2xl p-4">
      <h3 className="text-lg font-semibold mb-2">{title}</h3>
      <p className="text-sm text-white/70 leading-relaxed">{description}</p>
    </div>
  );
}

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white">
      <header className="max-w-5xl mx-auto px-6 py-10 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-brandBlue to-brandGreen flex items-center justify-center text-xl font-bold">
            H
          </div>
          <div>
            <p className="text-lg font-semibold">helpem</p>
            <p className="text-xs text-white/60">Your calm personal assistant</p>
          </div>
        </div>
        <a href="mailto:hello@helpem.app" className="text-sm text-white/80 hover:text-white underline underline-offset-4">
          Contact
        </a>
      </header>

      <main className="max-w-5xl mx-auto px-6 pb-16">
        <section className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 shadow-2xl shadow-black/30">
          <p className="text-sm uppercase tracking-[0.3em] text-white/60 mb-4">Introducing</p>
          <h1 className="text-3xl md:text-5xl font-bold leading-tight mb-4">
            A personal assistant that listens, organizes, and follows through.
          </h1>
          <p className="text-lg md:text-xl text-white/70 max-w-3xl mb-8">
            helpem captures your todos, appointments, routines, and reminders with minimal back-and-forth.
            It asks only what’s necessary, confirms once, and keeps you on track.
          </p>

          <div className="grid md:grid-cols-3 gap-4 mb-10">
            <Feature title="Minimal friction" description="One concise follow-up for missing info, then a single confirmation." />
            <Feature title="Voice-first" description="Optimized for the iOS app with verbal prompts; web for previews and account access." />
            <Feature title="Predictable" description="Consistent category handling: todos, appointments, routines, and groceries." />
          </div>

          <div className="bg-white/5 border border-white/10 rounded-2xl p-6 space-y-3">
            <h2 className="text-xl font-semibold">Coming soon</h2>
            <p className="text-white/70">We’re preparing the native iOS app for broader testing. Want early access? Get in touch.</p>
            <a
              href="mailto:hello@helpem.app?subject=Helpem%20Early%20Access"
              className="inline-flex items-center justify-center px-4 py-2 rounded-xl bg-gradient-to-r from-brandBlue to-brandGreen text-white font-semibold shadow-lg shadow-brandBlue/25 hover:shadow-xl transition-all"
            >
              Request early access
            </a>
          </div>
        </section>
      </main>
    </div>
  );
}
