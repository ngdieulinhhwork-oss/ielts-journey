import { Leaf } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signInAction, signUpAction } from "./actions";

type SearchParams = Promise<{ mode?: string; error?: string; message?: string }>;

export default async function LoginPage({ searchParams }: { searchParams: SearchParams }) {
  const { mode = "signin", error, message } = await searchParams;
  const configured = isSupabaseConfigured();
  const isSignup = mode === "signup";

  return (
    <div className="flex min-h-screen items-center justify-center bg-soft p-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-accent-strong">
          <Leaf className="h-10 w-10" aria-hidden />
          <h1 className="text-xl font-semibold">{isSignup ? "Tạo tài khoản" : "Đăng nhập"}</h1>
        </div>

        {!configured ? (
          <div role="alert" className="rounded-2xl bg-beige p-4 text-sm">
            <p className="font-medium">Chưa cấu hình Supabase</p>
            <p className="mt-1 text-foreground/70">
              Thêm NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY vào file .env.local, rồi khởi động lại app.
            </p>
          </div>
        ) : (
          <form action={isSignup ? signUpAction : signInAction} className="space-y-4">
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Email</span>
              <input name="email" type="email" required autoComplete="email"
                className="w-full rounded-xl border border-black/10 bg-background px-3 py-2 focus:outline-2 focus:outline-accent" />
            </label>
            <label className="block text-sm">
              <span className="mb-1 block font-medium">Mật khẩu (ít nhất 8 ký tự)</span>
              <input name="password" type="password" required minLength={8}
                autoComplete={isSignup ? "new-password" : "current-password"}
                className="w-full rounded-xl border border-black/10 bg-background px-3 py-2 focus:outline-2 focus:outline-accent" />
            </label>
            {error && <p role="alert" className="rounded-xl bg-beige p-3 text-sm text-red-800">{error}</p>}
            {message && <p role="status" className="rounded-xl bg-soft p-3 text-sm">{message}</p>}
            <button type="submit"
              className="w-full rounded-xl bg-accent-strong px-4 py-2.5 font-medium text-white transition-colors hover:opacity-90">
              {isSignup ? "Tạo tài khoản" : "Đăng nhập"}
            </button>
          </form>
        )}

        {configured && (
          <p className="mt-6 text-center text-sm text-foreground/70">
            {isSignup ? (
              <a className="underline" href="/login?mode=signin">Đã có tài khoản? Đăng nhập</a>
            ) : (
              <a className="underline" href="/login?mode=signup">Chưa có tài khoản? Tạo mới</a>
            )}
          </p>
        )}
      </div>
    </div>
  );
}
