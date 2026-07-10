export default function DashboardPreview() {
  return (
    <section className="bg-gray-50 py-28">
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center">
          <p className="text-blue-600 font-semibold">
            AI DASHBOARD
          </p>

          <h2 className="text-5xl font-bold mt-4">
            Everything in one place
          </h2>
        </div>

        <div className="mt-16 rounded-3xl border bg-white shadow-xl p-10">

          <div className="grid grid-cols-3 gap-6">

            <div className="rounded-2xl bg-blue-600 p-8 text-white">
              <h3 className="text-xl font-bold">
                Market Score
              </h3>

              <p className="text-6xl mt-6 font-black">
                91
              </p>
            </div>

            <div className="rounded-2xl border p-8">
              <h3 className="font-bold">
                Competitors
              </h3>

              <p className="text-5xl mt-5">
                42
              </p>
            </div>

            <div className="rounded-2xl border p-8">
              <h3 className="font-bold">
                Opportunity
              </h3>

              <p className="text-5xl mt-5 text-green-600">
                High
              </p>
            </div>

          </div>

        </div>

      </div>
    </section>
  );
}