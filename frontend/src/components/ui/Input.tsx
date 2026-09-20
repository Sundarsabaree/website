import React from "react";

interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  leftIcon?: React.ReactNode;
  rightElement?: React.ReactNode;
}

export const Input: React.FC<InputProps> = ({
  label,
  error,
  leftIcon,
  rightElement,
  className = "",
  id,
  ...props
}) => {
  const inputId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={inputId}
          className="block text-sm font-medium text-slate-300"
        >
          {label}
        </label>
      )}
      <div className="relative">
        {leftIcon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400">
            {leftIcon}
          </div>
        )}
        <input
          id={inputId}
          className={`
            w-full bg-slate-800/80 border rounded-xl text-slate-100 placeholder-slate-500
            focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60
            transition-all duration-200
            ${error ? "border-red-500/60 focus:ring-red-500/60" : "border-slate-700 hover:border-slate-600"}
            ${leftIcon ? "pl-10" : "pl-4"}
            ${rightElement ? "pr-10" : "pr-4"}
            py-2.5 text-sm
            ${className}
          `}
          {...props}
        />
        {rightElement && (
          <div className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
            {rightElement}
          </div>
        )}
      </div>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};

interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  error?: string;
  options: { value: string; label: string }[];
}

export const Select: React.FC<SelectProps> = ({
  label,
  error,
  options,
  className = "",
  id,
  ...props
}) => {
  const selectId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={selectId}
          className="block text-sm font-medium text-slate-300"
        >
          {label}
        </label>
      )}
      <select
        id={selectId}
        className={`
          w-full bg-slate-800/80 border rounded-xl text-slate-100 placeholder-slate-500
          focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60
          transition-all duration-200 px-4 py-2.5 text-sm
          ${error ? "border-red-500/60" : "border-slate-700 hover:border-slate-600"}
          ${className}
        `}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-800">
            {opt.label}
          </option>
        ))}
      </select>
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};

interface TextAreaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  error?: string;
}

export const TextArea: React.FC<TextAreaProps> = ({
  label,
  error,
  className = "",
  id,
  ...props
}) => {
  const textareaId = id || label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label
          htmlFor={textareaId}
          className="block text-sm font-medium text-slate-300"
        >
          {label}
        </label>
      )}
      <textarea
        id={textareaId}
        className={`
          w-full bg-slate-800/80 border rounded-xl text-slate-100 placeholder-slate-500
          focus:outline-none focus:ring-2 focus:ring-blue-500/60 focus:border-blue-500/60
          transition-all duration-200 px-4 py-2.5 text-sm resize-none
          ${error ? "border-red-500/60" : "border-slate-700 hover:border-slate-600"}
          ${className}
        `}
        rows={3}
        {...props}
      />
      {error && <p className="text-xs text-red-400">{error}</p>}
    </div>
  );
};
export default Input;
