"use client";

export function SocialProofSection() {
  const logos = [
    { name: "HyperScale", tag: "HYPERSCALE" },
    { name: "Vanguard Cloud", tag: "VANGUARD" },
    { name: "Apex Dynamics", tag: "APEX//DYNAMICS" },
    { name: "KiteLogic", tag: "KITELOGIC" },
    { name: "Stratos AI", tag: "STRATOS.AI" },
  ];

  return (
    <section className="py-14 sm:py-20 border-y border-neutral-200 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-12">
        {/* Title */}
        <div className="text-center space-y-2">
          <p className="text-xs uppercase tracking-widest font-bold text-neutral-500">
            Trusted By Modern GTM Teams
          </p>
          <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-black">
            Built for teams that want more conversations, not more busywork.
          </h2>
        </div>

        {/* Company Logos Grid */}
        <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-14 md:gap-16 opacity-75">
          {logos.map((logo) => (
            <div
              key={logo.name}
              className="flex items-center gap-2 group transition-opacity hover:opacity-100"
            >
              <div className="h-6 w-1.5 rounded-full bg-palm-leaf-500/40 group-hover:bg-palm-leaf-500 transition-colors" />
              <span className="font-extrabold text-sm sm:text-base tracking-widest text-neutral-600 group-hover:text-black transition-colors">
                {logo.tag}
              </span>
            </div>
          ))}
        </div>

        {/* 3 Metric Highlights */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-6">
          <div className="p-6 rounded-2xl border border-neutral-200 bg-white shadow-2xs text-center space-y-1.5">
            <div className="text-3xl sm:text-4xl font-extrabold text-palm-leaf-600 tracking-tight">
              10,000+
            </div>
            <div className="text-sm font-semibold text-black">
              Leads Managed
            </div>
            <p className="text-xs text-neutral-600">
              Across active B2B campaigns and personalized pipelines.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-neutral-200 bg-white shadow-2xs text-center space-y-1.5">
            <div className="text-3xl sm:text-4xl font-extrabold text-palm-leaf-600 tracking-tight">
              85%
            </div>
            <div className="text-sm font-semibold text-black">
              Less Manual Research
            </div>
            <p className="text-xs text-neutral-600">
              AI automates company enrichment, ICP scoring, and summaries.
            </p>
          </div>

          <div className="p-6 rounded-2xl border border-neutral-200 bg-white shadow-2xs text-center space-y-1.5">
            <div className="text-3xl sm:text-4xl font-extrabold text-palm-leaf-600 tracking-tight">
              3&times;
            </div>
            <div className="text-sm font-semibold text-black">
              Faster Personalization
            </div>
            <p className="text-xs text-neutral-600">
              Tailored opening hooks written automatically for human approval.
            </p>
          </div>
        </div>

        <p className="text-[11px] text-center text-neutral-400">
          * Illustrative product benchmarks based on verified sales automation workflows.
        </p>
      </div>
    </section>
  );
}
