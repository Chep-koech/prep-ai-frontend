import { ButtonHTMLAttributes } from "react";

type Variant = "primary" | "secondary" | "danger" | "ghost";

type Props = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const variants: Record<Variant, string> = {
  primary:
    "bg-blue-600 hover:bg-blue-700 text-white disabled:bg-blue-900/40 disabled:text-white/60",
  secondary:
    "bg-gray-800 hover:bg-gray-700 text-white border border-gray-700 disabled:opacity-50",
  danger:
    "bg-red-600 hover:bg-red-700 text-white disabled:bg-red-900/40 disabled:text-white/60",
  ghost:
    "bg-transparent hover:bg-gray-800 text-gray-200 border border-gray-700 disabled:opacity-50",
};

export default function Button({
  variant = "primary",
  className = "",
  children,
  ...rest
}: Props) {
  return (
    <button
      {...rest}
      className={`px-6 py-3 rounded-xl font-semibold transition disabled:cursor-not-allowed ${variants[variant]} ${className}`}
    >
      {children}
    </button>
  );
}
