const users = [
  {
    name: "Sarah",
    company: "Founder",
    text: "Atlas AI saved weeks of market research.",
  },
  {
    name: "Michael",
    company: "Startup CEO",
    text: "The competitor analysis is incredibly useful.",
  },
  {
    name: "David",
    company: "Product Builder",
    text: "I now validate every idea before building.",
  },
];

export default function Testimonials() {
  return (
    <section className="py-28 bg-white">

      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center">
          <h2 className="text-5xl font-bold">
            Loved by founders
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16">

          {users.map((user) => (
            <div
              key={user.name}
              className="rounded-3xl border p-8 shadow-sm"
            >
              <p className="text-gray-600 italic">
                "{user.text}"
              </p>

              <div className="mt-8">
                <h3 className="font-bold">
                  {user.name}
                </h3>

                <p className="text-gray-500">
                  {user.company}
                </p>
              </div>

            </div>
          ))}

        </div>

      </div>

    </section>
  );
}