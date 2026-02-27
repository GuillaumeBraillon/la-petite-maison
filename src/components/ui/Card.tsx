import type { HTMLAttributes, ReactNode } from "react";

// ------------------------------------------------------------
// Props
// ------------------------------------------------------------

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  padding?: "none" | "sm" | "md" | "lg";
  hover?: boolean;
}

interface CardSectionProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
}

interface CardTitleProps extends HTMLAttributes<HTMLHeadingElement> {
  children: ReactNode;
}

// ------------------------------------------------------------
// Styles
// ------------------------------------------------------------

const paddingClasses = {
  none: "",
  sm: "p-3",
  md: "p-5",
  lg: "p-6",
};

// ------------------------------------------------------------
// Component
// ------------------------------------------------------------

export const Card = ({ children, padding = "md", hover = false, className = "", ...props }: CardProps) => {
  const isClickable = typeof props.onClick === "function";

  return (
    <div
      className={[
        "bg-white rounded-xl border border-gray-200 shadow-sm",
        paddingClasses[padding],
        hover ? `hover:shadow-md transition-shadow ${isClickable ? "cursor-pointer" : ""}` : "",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
};

export const CardHeader = ({ children, className = "", ...props }: CardSectionProps) => (
  <div className={`px-6 py-4 border-b border-gray-100 ${className}`} {...props}>
    {children}
  </div>
);

export const CardTitle = ({ children, className = "", ...props }: CardTitleProps) => (
  <h3 className={`text-lg font-semibold text-gray-900 ${className}`} {...props}>
    {children}
  </h3>
);

export const CardContent = ({ children, className = "", ...props }: CardSectionProps) => (
  <div className={`p-6 ${className}`} {...props}>
    {children}
  </div>
);
