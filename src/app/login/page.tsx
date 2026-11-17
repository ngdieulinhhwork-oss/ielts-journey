import { Leaf } from "lucide-react";
import { isSupabaseConfigured } from "@/lib/supabase/config";

export default function LoginPage() {
  const configured = isSupabaseConfigured();
  return (
    <div className="flex min-h-screen items-center justify-center bg-soft p-4">
      <div className="w-full max-w-md rounded-3xl bg-card p-8 shadow-sm">
        <div className="mb-6 flex flex-col items-center gap-2 text-accent-strong">
          <Leaf className="h-10 w-10" aria-hidden />
          <h1 className="text-xl font-semibold">Đăng nhập</h1>
        </div>
        {configured ? (
          <p className="text-sm text-foreground/70">Form đăng nhập sẽ được thêm ở bước tiếp theo.</p>
        ) : (
          <div role="alert" className="rounded-2xl bg-beige p-4 text-sm">
            <p className="font-medium">Chưa cấu hình Supabase</p>
            <p className="mt-1 text-foreground/70">
              Thêm NEXT_PUBLIC_SUPABASE_URL và NEXT_PUBLIC_SUPABASE_ANON_KEY vào file .env.local rồi khởi động lại app.
              Xem file .env.example.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
