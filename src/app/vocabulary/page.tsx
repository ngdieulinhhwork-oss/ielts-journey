import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { addWordAction, reviewWordAction } from "./actions";

export default async function VocabularyPage() {
  if (!isSupabaseConfigured()) return <p role="alert">Chưa cấu hình Supabase.</p>;
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const [dueRes, allRes] = await Promise.all([
    supabase.from("vocabulary").select("id,term,meaning_vi,example,status").lte("next_review_at", nowIso).order("next_review_at").limit(20),
    supabase.from("vocabulary").select("id,term,meaning_vi,status,next_review_at").order("created_at", { ascending: false }).limit(100),
  ]);
  const due = dueRes.data ?? [];
  const all = allRes.data ?? [];
  const counts = { new: 0, learning: 0, reviewing: 0, mastered: 0 } as Record<string, number>;
  all.forEach((w) => { counts[w.status] = (counts[w.status] ?? 0) + 1; });

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent-strong">Từ vựng</h1>
        <p className="text-sm text-foreground/70">Ôn lặp theo thuật toán SM-2: từ quên sẽ quay lại sớm, từ nhớ sẽ giãn dần.</p>
      </header>

      <section className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {(["new", "learning", "reviewing", "mastered"] as const).map((s) => (
          <div key={s} className="rounded-2xl bg-soft p-4">
            <p className="text-xs text-foreground/70">{({ new: "Mới", learning: "Đang học", reviewing: "Đang ôn", mastered: "Đã thuộc" })[s]}</p>
            <p className="text-xl font-semibold">{counts[s] ?? 0}</p>
          </div>
        ))}
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-sm">
        <h2 className="font-semibold">Cần ôn hôm nay ({due.length})</h2>
        {due.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/70">Không có từ nào đến hạn. Thêm từ mới bên dưới để bắt đầu.</p>
        ) : (
          <ul className="mt-3 space-y-3">
            {due.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl bg-soft p-4">
                <div>
                  <p className="font-medium">{w.term}</p>
                  <p className="text-sm text-foreground/70">{w.meaning_vi ?? "(chưa có nghĩa)"}</p>
                  {w.example && <p className="text-xs italic text-foreground/60">{w.example}</p>}
                </div>
                <div className="flex gap-2">
                  <form action={reviewWordAction}>
                    <input type="hidden" name="id" value={w.id} />
                    <input type="hidden" name="quality" value="1" />
                    <button className="rounded-xl border border-black/10 bg-card px-3 py-1.5 text-sm">Quên</button>
                  </form>
                  <form action={reviewWordAction}>
                    <input type="hidden" name="id" value={w.id} />
                    <input type="hidden" name="quality" value="4" />
                    <button className="rounded-xl bg-accent-strong px-3 py-1.5 text-sm text-white">Nhớ</button>
                  </form>
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-sm">
        <h2 className="font-semibold">Thêm từ mới</h2>
        <form action={addWordAction} className="mt-4 grid gap-3 md:grid-cols-2">
          <input name="term" required placeholder="Từ hoặc cụm từ" className="rounded-xl border border-black/10 bg-background px-3 py-2" />
          <input name="meaning_vi" placeholder="Nghĩa tiếng Việt" className="rounded-xl border border-black/10 bg-background px-3 py-2" />
          <input name="example" placeholder="Câu ví dụ" className="rounded-xl border border-black/10 bg-background px-3 py-2" />
          <input name="topic" placeholder="Chủ đề IELTS (ví dụ: Environment)" className="rounded-xl border border-black/10 bg-background px-3 py-2" />
          <button className="rounded-xl bg-accent-strong px-4 py-2 text-white md:col-span-2">Lưu từ</button>
        </form>
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-sm">
        <h2 className="font-semibold">Danh sách gần đây</h2>
        {all.length === 0 ? (
          <p className="mt-2 text-sm text-foreground/70">Chưa có từ nào.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/5 text-sm">
            {all.map((w) => (
              <li key={w.id} className="flex justify-between py-2">
                <span>{w.term} <span className="text-foreground/60">— {w.meaning_vi ?? ""}</span></span>
                <span className="text-foreground/60">{w.status}</span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
