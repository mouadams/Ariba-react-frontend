import { motion } from "framer-motion";

export function Logo({ className = "" }: { className?: string }) {
  return (
    <motion.div
      initial={{ rotate: -10, opacity: 0 }}
      animate={{ rotate: 0, opacity: 1 }}
      className={`relative flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-primary shadow-elegant ${className}`}
    >
      <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.2">
        <path d="M4 7l8-4 8 4-8 4-8-4z" />
        <path d="M4 12l8 4 8-4" />
        <path d="M4 17l8 4 8-4" />
      </svg>
    </motion.div>
  );
}