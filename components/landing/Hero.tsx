export default function Hero() {
  return (
    <section className="mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 pt-24 text-center">
      <span className="mb-6 rounded-full border border-gray-200 px-4 py-2 text-sm font-medium">
        🚀 AI Market Intelligence Platform
      </span>

      <h1 className="max-w-5xl text-5xl font-bold leading-tight md:text-7xl">
        Build the{" "}
        <span className="text-blue-600">right company</span>
        <br />
        before you write{" "}
        <span className="text-blue-600">a single line of code.</span>
      </h1>

      <p className="mt-8 max-w-3xl text-xl text-gray-600">
        Discover real market opportunities, analyze competitors,
        understand customer pain points, and validate startup ideas
        using AI.
      </p>

      <div className="mt-12 flex gap-4">
        <button className="rounded-xl bg-blue-600 px-8 py-4 font-semibold text-white hover:bg-blue-700 transition">
          Get Started
        </button>

        <button className="rounded-xl border border-gray-300 px-8 py-4 font-semibold hover:bg-gray-100 transition">
          Live Demo
        </button>
      </div>
    </section>
  );
}