export default function CambridgePage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent-strong">Cambridge IELTS</h1>
        <p className="text-sm text-foreground/70">Thư viện sách và đề. Chỉ lưu liên kết bạn có quyền truy cập.</p>
      </header>
      <section className="rounded-3xl bg-card p-6 shadow-sm">
        <p className="text-sm text-foreground/70">Chưa có sách nào. Thêm sách Cambridge để bắt đầu theo dõi từng đề.</p>
        <p className="mt-3 text-sm text-foreground/70">Chưa có tài liệu — Thêm liên kết</p>
      </section>
    </div>
  );
}
