import React from "react";
import { Loader2 } from "lucide-react";

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?:
    | "primary"
    | "secondary"
    | "outline"
    | "danger"
    | "ghost"
    | "success";
  size?: "sm" | "md" | "lg";
  isLoading?: boolean;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
}

export const Button: React.FC<ButtonProps> = ({
  children,
  variant = "primary",
  size = "md",
  isLoading = false,
  leftIcon,
  rightIcon,
  className = "",
  disabled,
  ...props
}) => {
  const baseStyles =
    "inline-flex items-center justify-center font-medium rounded-lg transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900 disabled:opacity-50 disabled:cursor-not-allowed";

  const sizeStyles = {
    sm: "text-xs px-3 py-1.5 gap-1.5",
    md: "text-sm px-4 py-2 gap-2",
    lg: "text-base px-6 py-2.5 gap-2.5",
  };

  const variantStyles = {
    primary:
      "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-600/20 focus:ring-blue-500 active:scale-[0.98]",
    secondary:
      "bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 focus:ring-slate-500 active:scale-[0.98]",
    outline:
      "bg-transparent hover:bg-slate-800 text-slate-300 border border-slate-600 hover:border-slate-500 focus:ring-blue-500",
    danger:
      "bg-red-600 hover:bg-red-500 text-white shadow-lg shadow-red-600/20 focus:ring-red-500 active:scale-[0.98]",
    ghost:
      "bg-transparent hover:bg-slate-800/60 text-slate-300 hover:text-white focus:ring-slate-500",
    success:
      "bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-600/20 focus:ring-emerald-500 active:scale-[0.98]",
  };

  return (
    <button
      className={`${baseStyles} ${sizeStyles[size]} ${variantStyles[variant]} ${className}`}
      disabled={disabled || isLoading}
      {...props}
    >
      {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : leftIcon}
      <span>{children}</span>
      {!isLoading && rightIcon}
    </button>
  );
};
export default Button;
