export default function LogoCloud() {
  const logos = [
    "Google",
    "OpenAI",
    "Microsoft",
    "Stripe",
    "Vercel",
    "Notion",
  ];

  return (
    <section className="border-y border-gray-200 bg-white py-10">
      <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-center gap-12 px-6">
        {logos.map((logo) => (
          <span
            key={logo}
            className="text-lg font-semibold text-gray-400 transition hover:text-gray-700"
          >
            {logo}
          </span>
        ))}
      </div>
    </section>
  );
}