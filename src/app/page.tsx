import { Sprout, Target } from "lucide-react";

export default function Home() {
  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-col gap-2">
        <h1 className="text-2xl font-semibold text-accent-strong">Chào buổi học hôm nay</h1>
        <p className="text-foreground/70">Mục tiêu của bạn: IELTS Overall 6.5</p>
      </header>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-accent" aria-hidden />
            <h2 className="font-semibold">Mục tiêu</h2>
          </div>
          <p className="mt-3 text-sm text-foreground/70">
            Chưa có điểm nào được ghi nhận. Hãy thêm bài thi đầu tiên để thấy tiến độ của bạn.
          </p>
        </div>
        <div className="rounded-3xl bg-soft p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Sprout className="h-6 w-6 text-accent-strong" aria-hidden />
            <h2 className="font-semibold">Bắt đầu nhé</h2>
          </div>
          <p className="mt-3 text-sm text-foreground/70">
            Bước tiếp theo: kết nối Supabase để lưu dữ liệu riêng tư của bạn.
          </p>
        </div>
      </section>
    </div>
  );
}
