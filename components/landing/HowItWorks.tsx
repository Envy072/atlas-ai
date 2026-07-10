import { Search, Brain, Rocket } from "lucide-react";

const steps = [
  {
    icon: Search,
    title: "Discover",
    text: "Describe your startup idea in a few sentences.",
  },
  {
    icon: Brain,
    title: "Analyze",
    text: "Atlas AI researches competitors and market demand.",
  },
  {
    icon: Rocket,
    title: "Launch",
    text: "Receive a complete report before writing code.",
  },
];

export default function HowItWorks() {
  return (
    <section className="py-28 bg-white">
      <div className="max-w-7xl mx-auto px-6">

        <div className="text-center">
          <p className="text-blue-600 font-semibold">
            HOW IT WORKS
          </p>

          <h2 className="text-5xl font-bold mt-4">
            Three simple steps
          </h2>
        </div>

        <div className="grid md:grid-cols-3 gap-8 mt-16">

          {steps.map((step) => (
            <div
              key={step.title}
              className="rounded-3xl border p-10 text-center"
            >
              <step.icon
                className="mx-auto text-blue-600"
                size={42}
              />

              <h3 className="text-2xl font-bold mt-6">
                {step.title}
              </h3>

              <p className="mt-4 text-gray-600">
                {step.text}
              </p>
            </div>
          ))}

        </div>

      </div>
    </section>
  );
}