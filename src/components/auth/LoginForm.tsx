import { useState } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginFormData = z.infer<typeof loginSchema>;

export default function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
  });

  const onSubmit = async (data: LoginFormData) => {
    try {
      setLoading(true);
      setError(null);

      const success = await login(data.email, data.password);

      if (!success) {
        setError("Login failed. Please check your credentials.");
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError("Login failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="uiux-login-page py-12 px-4 sm:px-6 lg:px-8">
      <div className="uiux-login-card animate-uiux-fade-slide-up">
        <h1 className="uiux-login-title">withu</h1>
        <p className="uiux-login-subtitle">Sign in to your account</p>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          {error && (
            <div
              className="rounded-[var(--radius-md)] px-4 py-3 text-sm"
              style={{
                background: "var(--color-danger-bg)",
                border: "1px solid rgba(220,38,38,0.25)",
                color: "var(--color-danger)",
              }}
            >
              {error}
            </div>
          )}

          <div>
            <Label htmlFor="email" className="text-white/70 text-xs font-medium uppercase tracking-wider mb-2 block">
              Email
            </Label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className={`uiux-login-input ${errors.email ? "!border-[var(--color-danger)]" : ""}`}
              placeholder="Enter your email"
            />
            {errors.email && (
              <p className="text-red-300 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="password" className="text-white/70 text-xs font-medium uppercase tracking-wider mb-2 block">
              Password
            </Label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                {...register("password")}
                className={`uiux-login-input pr-12 ${errors.password ? "!border-[var(--color-danger)]" : ""}`}
                placeholder="Enter your password"
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute right-0 top-0 h-full px-3 py-2 text-white/60 hover:text-white hover:bg-transparent"
                onClick={() => setShowPassword(!showPassword)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </Button>
            </div>
            {errors.password && (
              <p className="text-red-300 text-sm mt-1">{errors.password.message}</p>
            )}
          </div>

          <div className="flex items-center justify-end">
            <Link to="/forgot-password" className="text-sm text-[var(--color-gold-300)] hover:text-[var(--color-gold-400)] hover:underline">
              Forgot Password?
            </Link>
          </div>

          <button type="submit" className="uiux-login-btn disabled:opacity-50 disabled:pointer-events-none" disabled={loading}>
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Signing in...
              </span>
            ) : (
              "Sign In"
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
