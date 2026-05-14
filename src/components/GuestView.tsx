import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Sparkles, FileSpreadsheet, Download, Loader2, ShieldCheck, Zap, BarChart3, Workflow } from "lucide-react";
import { useApp } from "@/context/app-context";
import { Logo } from "./Logo";
import { toast } from "sonner";
import { authService } from "@/services/authService";
import { InputOTP, InputOTPGroup, InputOTPSlot, InputOTPSeparator } from "@/components/ui/input-otp";

export function GuestView() {
  const { login, aiEnabled, setAiEnabled } = useApp();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [tab, setTab] = useState("login");

  // OTP Verification State
  const [regStep, setRegStep] = useState<1 | 2 | 3>(1);
  const [otpCode, setOtpCode] = useState("");
  const [regData, setRegData] = useState({ name: "", email: "", password: "" });
  const [regExpires, setRegExpires] = useState<number>(300);
  const [regSentAt, setRegSentAt] = useState<number | null>(null);
  const [remainingTime, setRemainingTime] = useState<number>(0);
  const [now, setNow] = useState(Math.floor(Date.now() / 1000));

  useEffect(() => {
    const ticker = setInterval(() => {
      setNow(Math.floor(Date.now() / 1000));
    }, 1000);
    return () => clearInterval(ticker);
  }, []);

  useEffect(() => {
    if (regStep === 2 && regSentAt) {
      const elapsed = now - regSentAt;
      const remaining = Math.max(0, regExpires - elapsed);
      setRemainingTime(remaining);
    }
  }, [regStep, regSentAt, regExpires, now]);

  const submitLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast.error("Please complete all fields");
      return;
    }
    setLoading(true);
    try {
      const data = await authService.login(email, password);
      localStorage.setItem("access_token", data.access_token);
      localStorage.setItem("user_name", data.user_name || "User");
      localStorage.setItem("user_email", email);
      login(data.user_name || "User", email);
      toast.success("Authenticated. Welcome aboard.");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Authentication failed.");
    } finally {
      setLoading(false);
    }
  };

  const submitRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !email || !password) {
      toast.error("Please complete all fields");
      return;
    }
    setLoading(true);
    try {
      await authService.sendOtp(email);
      setRegData({ name, email, password });
      setRegSentAt(Math.floor(Date.now() / 1000));
      setRegExpires(300);
      setRegStep(2);
      toast.success("Verification code sent to your email.");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to send verification code.");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length !== 6) {
      toast.error("Please enter a valid 6-digit code.");
      return;
    }
    setLoading(true);
    try {
      await authService.verifyOtp(regData.email, otpCode);
      const data = await authService.register(regData.name, regData.email, regData.password, otpCode);
      
      const loginData = await authService.login(regData.email, regData.password);
      localStorage.setItem("access_token", loginData.access_token);
      localStorage.setItem("user_name", loginData.user_name || "User");
      localStorage.setItem("user_email", regData.email);
      
      setRegStep(3);
      toast.success("Account created and verified successfully!");
      
      setTimeout(() => {
        login(loginData.user_name || "User", regData.email);
      }, 1500);
      
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Verification failed.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setLoading(true);
    try {
      await authService.sendOtp(regData.email);
      setRegSentAt(Math.floor(Date.now() / 1000));
      setRegExpires(300);
      toast.success("New verification code sent!");
    } catch (error: any) {
      toast.error(error.response?.data?.detail || "Failed to resend code.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-card border shadow-sm rounded-xl p-8 w-[480px] max-w-full">
      <div className="mb-6 flex items-center gap-3">
        <Logo />
        <div>
          <div className="text-sm font-semibold tracking-tight">ERP Ariba Platform</div>
          <div className="text-[11px] uppercase tracking-widest text-muted-foreground">Enterprise Suite</div>
        </div>
      </div>

      <Tabs value={tab} onValueChange={(v) => { if(regStep === 1 || v === "login") setTab(v); }} className="w-full">
        <TabsList className="grid w-full grid-cols-2 rounded-xl">
          <TabsTrigger value="login" className="rounded-lg">Sign in</TabsTrigger>
          <TabsTrigger value="register" className="rounded-lg" disabled={regStep > 1}>Register</TabsTrigger>
        </TabsList>

        <TabsContent value="login" className="mt-5">
          <form onSubmit={submitLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Work email</Label>
              <Input id="email" type="email" placeholder="alex@enterprise.com" value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" value={password} onChange={(e) => setPassword(e.target.value)} />
            </div>
            <Button type="submit" disabled={loading} className="w-full">
              {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Authenticating</>) : "Access platform"}
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="register" className="mt-5">
          {regStep === 1 && (
            <form onSubmit={submitRegister} className="space-y-4">
              <div className="space-y-2">
                <Label>Full name</Label>
                <Input placeholder="Alex Carter" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Work email</Label>
                <Input type="email" placeholder="alex@enterprise.com" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
              </div>
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Sending Code...</>) : "Send Verification Code"}
              </Button>
            </form>
          )}

          {regStep === 2 && (
            <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="text-center space-y-2">
                <div className="bg-primary/10 text-primary mx-auto w-12 h-12 rounded-full flex items-center justify-center mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-semibold text-lg tracking-tight">Check your email</h3>
                <p className="text-sm text-muted-foreground">
                  We sent a 6-digit verification code to <strong>{regData.email}</strong>
                </p>
              </div>

              <form onSubmit={verifyAndRegister} className="space-y-4">
                <div className="flex justify-center py-2">
                  <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode}>
                    <InputOTPGroup>
                      <InputOTPSlot index={0} />
                      <InputOTPSlot index={1} />
                      <InputOTPSlot index={2} />
                      <InputOTPSlot index={3} />
                      <InputOTPSlot index={4} />
                      <InputOTPSlot index={5} />
                    </InputOTPGroup>
                  </InputOTP>
                </div>
                
                {remainingTime > 0 ? (
                  <p className="text-xs text-center text-muted-foreground">
                    Code expires in {Math.floor(remainingTime / 60)}:{(remainingTime % 60).toString().padStart(2, '0')}
                  </p>
                ) : (
                  <p className="text-xs text-center text-destructive">
                    Code has expired. Please request a new one.
                  </p>
                )}

                <div className="flex gap-3 pt-2">
                  <Button type="button" variant="outline" className="w-full" onClick={() => setRegStep(1)} disabled={loading}>
                    Back
                  </Button>
                  <Button type="submit" disabled={loading || otpCode.length !== 6 || remainingTime === 0} className="w-full">
                    {loading ? (<><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Verifying</>) : "Verify & Register"}
                  </Button>
                </div>
              </form>

              <div className="text-center">
                <Button 
                  variant="link" 
                  className="text-xs text-muted-foreground" 
                  disabled={loading || (regSentAt !== null && now - regSentAt < 60)}
                  onClick={handleResend}
                >
                  {regSentAt !== null && now - regSentAt < 60 
                    ? `Resend available in ${60 - (now - regSentAt)}s` 
                    : "Didn't receive the code? Resend"}
                </Button>
              </div>
            </div>
          )}

          {regStep === 3 && (
            <div className="space-y-4 text-center animate-in fade-in zoom-in duration-500 py-6">
              <div className="bg-green-500/10 text-green-500 mx-auto w-16 h-16 rounded-full flex items-center justify-center mb-4">
                <Sparkles className="w-8 h-8" />
              </div>
              <h3 className="font-semibold text-xl tracking-tight">Account Created!</h3>
              <p className="text-sm text-muted-foreground">
                Welcome aboard, {regData.name}. Redirecting to dashboard...
              </p>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}