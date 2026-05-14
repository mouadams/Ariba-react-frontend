import { AnimatePresence, motion } from "framer-motion";
import { useApp } from "@/context/app-context";
import { Header } from "./Header";
import { PipelineView } from "./PipelineView";
import { HistoryView } from "./HistoryView";

export function Dashboard() {
  const { view } = useApp();
  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Header />
      <main className="flex-1 w-full relative">
        <AnimatePresence mode="wait">
          <motion.div
            key={view}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.25 }}
            className="w-full"
          >
            {view === "pipeline" ? <PipelineView /> : <HistoryView />}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}