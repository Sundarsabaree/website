import React from "react";
import { motion } from "framer-motion";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  hover?: boolean;
  onClick?: () => void;
  gradient?: boolean;
}

export const Card: React.FC<CardProps> = ({
  children,
  className = "",
  hover = false,
  onClick,
  gradient = false,
}) => {
  const baseClass = `
    bg-slate-900 border border-slate-700/60 rounded-2xl
    ${hover ? "hover:border-slate-600 hover:-translate-y-0.5 hover:shadow-lg hover:shadow-black/30 cursor-pointer" : ""}
    ${gradient ? "bg-gradient-to-br from-slate-900 to-slate-800/50" : ""}
    transition-all duration-200
    ${className}
  `;

  if (onClick) {
    return (
      <motion.div
        whileHover={{ y: -2 }}
        className={baseClass}
        onClick={onClick}
      >
        {children}
      </motion.div>
    );
  }

  return <div className={baseClass}>{children}</div>;
};

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  change?: string;
  changeType?: "positive" | "negative" | "neutral";
  gradient?: string;
  loading?: boolean;
}

export const StatCard: React.FC<StatCardProps> = ({
  title,
  value,
  icon,
  change,
  changeType = "neutral",
  gradient,
  loading = false,
}) => {
  const changeColors = {
    positive: "text-emerald-400",
    negative: "text-red-400",
    neutral: "text-slate-400",
  };

  return (
    <motion.div
      whileHover={{ y: -2 }}
      className={`relative overflow-hidden bg-slate-900 border border-slate-700/60 rounded-2xl p-6 ${
        gradient ? `bg-gradient-to-br ${gradient}` : ""
      } transition-all duration-200 hover:border-slate-600 hover:shadow-xl hover:shadow-black/30`}
    >
      {/* Background glow */}
      {gradient && (
        <div className="absolute inset-0 opacity-5">
          <div className="absolute -top-4 -right-4 w-32 h-32 rounded-full bg-white blur-3xl" />
        </div>
      )}

      <div className="relative flex items-start justify-between">
        <div className="space-y-2">
          <p className="text-sm text-slate-400 font-medium">{title}</p>
          {loading ? (
            <div className="h-8 w-24 bg-slate-800 rounded-lg animate-pulse" />
          ) : (
            <p className="text-3xl font-bold font-heading text-white tracking-tight">
              {value}
            </p>
          )}
          {change && (
            <p className={`text-xs font-medium ${changeColors[changeType]}`}>
              {change}
            </p>
          )}
        </div>
        <div className="p-3 rounded-xl bg-slate-800/80 text-slate-300 border border-slate-700/50">
          {icon}
        </div>
      </div>
    </motion.div>
  );
};
export default Card;
