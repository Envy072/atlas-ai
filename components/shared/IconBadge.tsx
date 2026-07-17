import type { LucideIcon } from "lucide-react";

type IconBadgeSize = "sm" | "md" | "lg";

const WRAPPER_SIZE_CLASSES: Record<IconBadgeSize, string> = {
  sm: "rounded-xl p-3",
  md: "rounded-2xl p-3",
  lg: "rounded-2xl p-4",
};

const ICON_SIZE_CLASSES: Record<IconBadgeSize, string> = {
  sm: "h-6 w-6",
  md: "h-6 w-6",
  lg: "h-7 w-7",
};

interface IconBadgeProps {
  icon: LucideIcon;
  size?: IconBadgeSize;
  bgClassName?: string;
  textClassName?: string;
}

// The recurring "colored rounded chip with an icon in it" pattern used
// throughout the workspace/dashboard cards, parameterized by the size and
// color combinations that already exist in the app.
export default function IconBadge({
  icon: Icon,
  size = "lg",
  bgClassName = "bg-blue-100",
  textClassName = "text-blue-600",
}: IconBadgeProps) {
  return (
    <div className={`${WRAPPER_SIZE_CLASSES[size]} ${bgClassName}`}>
      <Icon className={`${ICON_SIZE_CLASSES[size]} ${textClassName}`} />
    </div>
  );
}
