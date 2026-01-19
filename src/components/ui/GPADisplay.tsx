import { motion } from "framer-motion";
import { getGPAStatus } from "@/lib/gpaCalculator";
import { cn } from "@/lib/utils";

interface GPADisplayProps {
  gpa: number;
  label?: string;
  size?: "sm" | "md" | "lg";
  showStatus?: boolean;
}

const sizeStyles = {
  sm: "h-20 w-20 text-xl",
  md: "h-28 w-28 text-2xl",
  lg: "h-36 w-36 text-4xl",
};

export function GPADisplay({
  gpa,
  label = "GPA",
  size = "md",
  showStatus = true,
}: GPADisplayProps) {
  const status = getGPAStatus(gpa);
  const percentage = (gpa / 4) * 100;

  return (
    <div className="flex flex-col items-center gap-2">
      <motion.div
        initial={{ scale: 0, rotate: -180 }}
        animate={{ scale: 1, rotate: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 15 }}
        className="relative"
      >
        {/* Background Circle */}
        <div
          className={cn(
            "rounded-full bg-muted flex items-center justify-center",
            sizeStyles[size]
          )}
        >
          {/* Progress Ring */}
          <svg
            className="absolute inset-0"
            viewBox="0 0 100 100"
          >
            <circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              className="text-muted"
            />
            <motion.circle
              cx="50"
              cy="50"
              r="45"
              fill="none"
              stroke="currentColor"
              strokeWidth="8"
              strokeLinecap="round"
              className={status.color.replace("text-", "text-")}
              style={{
                strokeDasharray: `${2 * Math.PI * 45}`,
                transformOrigin: "center",
                transform: "rotate(-90deg)",
              }}
              initial={{ strokeDashoffset: 2 * Math.PI * 45 }}
              animate={{
                strokeDashoffset: 2 * Math.PI * 45 * (1 - percentage / 100),
              }}
              transition={{ duration: 1.5, ease: "easeOut" }}
            />
          </svg>

          {/* GPA Value */}
          <span className={cn("font-bold", status.color)}>
            {gpa.toFixed(2)}
          </span>
        </div>
      </motion.div>

      <div className="text-center">
        <p className="text-sm font-medium text-muted-foreground">{label}</p>
        {showStatus && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.5 }}
            className={cn("text-xs font-semibold", status.color)}
          >
            {status.label}
          </motion.p>
        )}
      </div>
    </div>
  );
}
