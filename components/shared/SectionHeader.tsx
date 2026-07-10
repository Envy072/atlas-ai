"use client";

interface SectionHeaderProps {
  eyebrow: string;
  eyebrowClassName?: string;
  heading: string;
  description?: string;
}

// The "eyebrow / heading / description" block repeated at the top of every
// workspace analysis section (Problem, Solution, Market, Competition, ...).
export default function SectionHeader({
  eyebrow,
  eyebrowClassName = "text-blue-600",
  heading,
  description,
}: SectionHeaderProps) {
  return (
    <div>
      <p className={`text-sm font-semibold uppercase tracking-widest ${eyebrowClassName}`}>
        {eyebrow}
      </p>

      <h2 className="mt-2 text-3xl font-bold">
        {heading}
      </h2>

      {description && (
        <p className="mt-3 text-gray-500">
          {description}
        </p>
      )}
    </div>
  );
}
