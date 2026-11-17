import { Video } from "lucide-react";

export default function ResourcesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent-strong">Tài liệu & Video</h1>
        <p className="text-sm text-foreground/70">Thêm liên kết kênh YouTube của bạn. Mình không tự điền link chính thức.</p>
      </header>
      <section className="rounded-3xl bg-card p-6 shadow-sm">
        <div className="flex items-center gap-3">
          <Video className="h-6 w-6 text-accent" aria-hidden />
          <h2 className="font-semibold">Huy Forum</h2>
        </div>
        <p className="mt-3 text-sm text-foreground/70">Chưa có tài liệu — Thêm liên kết</p>
      </section>
    </div>
  );
}
