import { createContext, useContext, useState, ReactNode, useEffect } from "react";

type View = "pipeline" | "history";
type AppCtx = {
  user: { name: string; email: string } | null;
  login: (name: string, email: string) => void;
  logout: () => void;
  view: View;
  setView: (v: View) => void;
  aiEnabled: boolean;
  setAiEnabled: (v: boolean) => void;
};

const Ctx = createContext<AppCtx | null>(null);

export function AppProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AppCtx["user"]>(null);
  const [view, setView] = useState<View>("pipeline");
  const [aiEnabled, setAiEnabled] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("access_token");
    const name = localStorage.getItem("user_name");
    const email = localStorage.getItem("user_email");
    if (token && name && email) {
      setUser({ name, email });
    }

    const handleAuthError = () => {
      setUser(null);
      localStorage.removeItem("user_name");
      localStorage.removeItem("user_email");
    };
    window.addEventListener("auth-error", handleAuthError);
    return () => window.removeEventListener("auth-error", handleAuthError);
  }, []);

  return (
    <Ctx.Provider
      value={{
        user,
        login: (name, email) => setUser({ name, email }),
        logout: () => {
          setUser(null);
          localStorage.removeItem("access_token");
          localStorage.removeItem("user_name");
          localStorage.removeItem("user_email");
        },
        view,
        setView,
        aiEnabled,
        setAiEnabled,
      }}
    >
      {children}
    </Ctx.Provider>
  );
}

export const useApp = () => {
  const c = useContext(Ctx);
  if (!c) throw new Error("useApp must be inside AppProvider");
  return c;
};