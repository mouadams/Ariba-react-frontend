import { Workflow, History, User, LogOut, Sun, Moon, Monitor } from "lucide-react";
import { useApp } from "@/context/app-context";
import { useTheme } from "@/context/theme-provider";
import { Logo } from "./Logo";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { GuestView } from "./GuestView";

export function Header() {
  const { user, logout, view, setView } = useApp();
  const { theme, setTheme } = useTheme();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-border/60 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center px-6 max-w-[1800px] mx-auto gap-8">
        <div className="flex items-center gap-3 min-w-max">
          <Logo />
          <div>
            <div className="font-semibold text-sm tracking-tight leading-none">ERP Ariba</div>
            <div className="text-[10px] uppercase tracking-widest text-muted-foreground mt-1">Platform</div>
          </div>
        </div>

        <nav className="hidden md:flex items-center gap-2">
          <Button
            variant={view === "pipeline" ? "secondary" : "ghost"}
            className={`h-9 px-4 text-sm font-medium ${view === "pipeline" ? "bg-muted" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setView("pipeline")}
          >
            <Workflow className="mr-2 h-4 w-4" /> Pipeline
          </Button>
          <Button
            variant={view === "history" ? "secondary" : "ghost"}
            className={`h-9 px-4 text-sm font-medium ${view === "history" ? "bg-muted" : "text-muted-foreground hover:text-foreground"}`}
            onClick={() => setView("history")}
          >
            <History className="mr-2 h-4 w-4" /> History
          </Button>
        </nav>

        <div className="ml-auto flex items-center gap-4">
          <div className="flex bg-muted/50 rounded-md p-0.5 border border-border/50">
            <button 
              onClick={() => setTheme('light')} 
              className={`p-1.5 rounded-sm transition-all ${theme === 'light' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Light Mode"
            >
              <Sun className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={() => setTheme('system')} 
              className={`p-1.5 rounded-sm transition-all ${theme === 'system' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="System Theme"
            >
              <Monitor className="h-3.5 w-3.5" />
            </button>
            <button 
              onClick={() => setTheme('dark')} 
              className={`p-1.5 rounded-sm transition-all ${theme === 'dark' ? 'bg-background shadow-sm text-foreground' : 'text-muted-foreground hover:text-foreground'}`}
              title="Dark Mode"
            >
              <Moon className="h-3.5 w-3.5" />
            </button>
          </div>

          <div className="h-6 w-px bg-border/60 mx-2 hidden sm:block"></div>

          {user ? (
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-3">
                <div className="h-8 w-8 rounded-full bg-primary/5 border border-border flex items-center justify-center shrink-0">
                  <User className="h-4 w-4 text-primary" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate leading-tight">{user.name}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm" 
                className="h-8"
                onClick={() => { logout(); toast.success("Signed out securely"); }}
              >
                <LogOut className="mr-2 h-3.5 w-3.5" /> Sign out
              </Button>
            </div>
          ) : (
            <Dialog>
              <DialogTrigger asChild>
                <Button size="sm" className="h-8">Sign In</Button>
              </DialogTrigger>
              <DialogContent className="max-w-[480px] p-0 overflow-hidden bg-transparent border-none shadow-none">
                <GuestView />
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
    </header>
  );
}
