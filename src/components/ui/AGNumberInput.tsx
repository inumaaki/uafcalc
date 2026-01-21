import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

interface AGNumberInputProps {
  value: { year: string; number: string };
  onChange: (value: { year: string; number: string }) => void;
  onEnter?: () => void;
  className?: string;
}

export function AGNumberInput({ value, onChange, onEnter, className }: AGNumberInputProps) {
  const yearRef = useRef<HTMLInputElement>(null);
  const numberRef = useRef<HTMLInputElement>(null);
  const [focused, setFocused] = useState<"year" | "number" | null>(null);

  const handleYearChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newYear = e.target.value.replace(/\D/g, "").slice(0, 4);
    onChange({ ...value, year: newYear });

    if (newYear.length === 4) {
      numberRef.current?.focus();
    }
  };

  const handleNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newNumber = e.target.value.replace(/\D/g, "").slice(0, 6);
    onChange({ ...value, number: newNumber });
  };

  const handleYearKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onEnter) {
      onEnter();
    }
    if (e.key === "ArrowRight" && value.year.length === 4) {
      numberRef.current?.focus();
    }
  };

  const handleNumberKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && onEnter) {
      onEnter();
    }
    if (e.key === "Backspace" && value.number.length === 0) {
      yearRef.current?.focus();
    }
    if (e.key === "ArrowLeft" && (e.target as HTMLInputElement).selectionStart === 0) {
      yearRef.current?.focus();
    }
  };

  return (
    <motion.div
      className={cn(
        "flex items-center justify-center gap-1 md:gap-2 px-2 md:px-4 h-11 rounded-md border-2 transition-all duration-200 bg-card",
        focused ? "border-primary shadow-lg" : "border-border",
        className
      )}
      animate={focused ? { scale: 1.02 } : { scale: 1 }}
    >
      {/* Year Input */}
      <Input
        ref={yearRef}
        type="text"
        inputMode="numeric"
        placeholder="2022"
        value={value.year}
        onChange={handleYearChange}
        onKeyDown={handleYearKeyDown}
        onFocus={() => setFocused("year")}
        onBlur={() => setFocused(null)}
        className="w-14 md:w-20 text-center font-semibold text-lg border-none shadow-none outline-none ring-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0 placeholder:text-muted-foreground/50"
        maxLength={4}
      />

      {/* Separator */}
      <span className="text-lg md:text-xl font-bold text-primary">-</span>
      <span className="px-2 py-0.5 md:px-3 md:py-1 rounded-md bg-primary text-primary-foreground font-bold text-xs md:text-sm">
        AG
      </span>
      <span className="text-lg md:text-xl font-bold text-primary">-</span>

      {/* Number Input */}
      <Input
        ref={numberRef}
        type="text"
        inputMode="numeric"
        placeholder="7745"
        value={value.number}
        onChange={handleNumberChange}
        onKeyDown={handleNumberKeyDown}
        onFocus={() => setFocused("number")}
        onBlur={() => setFocused(null)}
        className="w-14 md:w-20 text-center font-semibold text-lg border-none shadow-none outline-none ring-0 bg-transparent p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        maxLength={6}
      />
    </motion.div>
  );
}
