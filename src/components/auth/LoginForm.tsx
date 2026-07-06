import { useState, useMemo } from "react";
import { Link } from "react-router-dom";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

type LoginFormData = {
  email: string;
  password: string;
};

export default function LoginForm() {
  const { t } = useTranslation();
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { login } = useAuth();

  const loginSchema = useMemo(
    () =>
      z.object({
        email: z.string().email(t("auth.invalidEmail")),
        password: z.string().min(6, t("auth.passwordMin")),
      }),
    [t],
  );

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
        setError(t("auth.loginFailed"));
      }
    } catch (err: any) {
      console.error("Login error:", err);
      setError(t("auth.loginFailedRetry"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="uiux-login-page py-12 px-4 sm:px-6 lg:px-8">
      <div className="uiux-login-card animate-uiux-fade-slide-up">
        <h1 className="uiux-login-title">{t("auth.title")}</h1>
        <p className="uiux-login-subtitle">{t("auth.subtitle")}</p>

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
              {t("auth.email")}
            </Label>
            <input
              id="email"
              type="email"
              autoComplete="email"
              {...register("email")}
              className={`uiux-login-input ${errors.email ? "!border-[var(--color-danger)]" : ""}`}
              placeholder={t("auth.emailPlaceholder")}
            />
            {errors.email && (
              <p className="text-red-300 text-sm mt-1">{errors.email.message}</p>
            )}
          </div>

          <div>
            <Label htmlFor="password" className="text-white/70 text-xs font-medium uppercase tracking-wider mb-2 block">
              {t("auth.password")}
            </Label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? "text" : "password"}
                autoComplete="current-password"
                {...register("password")}
                className={`uiux-login-input pe-12 ${errors.password ? "!border-[var(--color-danger)]" : ""}`}
                placeholder={t("auth.passwordPlaceholder")}
              />
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="absolute end-0 top-0 h-full px-3 py-2 text-white/60 hover:text-white hover:bg-transparent"
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
              {t("auth.forgotPassword")}
            </Link>
          </div>

          <button type="submit" className="uiux-login-btn disabled:opacity-50 disabled:pointer-events-none" disabled={loading}>
            {loading ? (
              <span className="inline-flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                {t("auth.signingIn")}
              </span>
            ) : (
              t("auth.signIn")
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
