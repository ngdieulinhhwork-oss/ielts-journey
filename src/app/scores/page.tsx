import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { addAttemptAction } from "./actions";

const fmt = (v: unknown) => (v == null ? "—" : Number(v).toFixed(1));

export default async function ScoresPage() {
  if (!isSupabaseConfigured()) return <p role="alert">Chưa cấu hình Supabase.</p>;
  const supabase = await createClient();
  const { data: attempts } = await supabase
    .from("test_attempts")
    .select("id,attempt_date,label,listening_band,reading_band,writing_band,speaking_band,overall_band,duration_minutes")
    .order("attempt_date", { ascending: false })
    .limit(100);
  const rows = attempts ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent-strong">Theo dõi điểm</h1>
        <p className="text-sm text-foreground/70">
          Overall chỉ được tính khi đủ 4 kỹ năng. Điểm tự nhập được ghi nhận là ước lượng luyện tập, không phải điểm chính thức.
        </p>
      </header>

      <section className="overflow-x-auto rounded-3xl bg-card p-4 shadow-sm">
        {rows.length === 0 ? (
          <p className="p-2 text-sm text-foreground/70">Chưa có bài thi nào. Thêm bài đầu tiên bên dưới.</p>
        ) : (
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-foreground/60">
              <tr><th className="p-2">Ngày</th><th>Bài</th><th>L</th><th>R</th><th>W</th><th>S</th><th>Overall</th><th>Phút</th></tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-black/5">
                  <td className="p-2">{r.attempt_date}</td>
                  <td>{r.label ?? "—"}</td>
                  <td>{fmt(r.listening_band)}</td>
                  <td>{fmt(r.reading_band)}</td>
                  <td>{fmt(r.writing_band)}</td>
                  <td>{fmt(r.speaking_band)}</td>
                  <td className="font-semibold">{fmt(r.overall_band)}</td>
                  <td>{r.duration_minutes ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-sm">
        <h2 className="font-semibold">Thêm bài thi</h2>
        <form action={addAttemptAction} className="mt-4 grid gap-3 md:grid-cols-4">
          <input name="attempt_date" type="date" required defaultValue={new Date().toISOString().slice(0, 10)} className="rounded-xl border border-black/10 bg-background px-3 py-2" />
          <input name="label" placeholder="Ví dụ: Cambridge 18 Test 2" className="rounded-xl border border-black/10 bg-background px-3 py-2 md:col-span-3" />
          {(["listening_band", "reading_band", "writing_band", "speaking_band"] as const).map((k) => (
            <input key={k} name={k} type="number" step={0.5} min={0} max={9} placeholder={k.replace("_band", "").toUpperCase() + " (để trống nếu chưa có)"}
              className="rounded-xl border border-black/10 bg-background px-3 py-2" />
          ))}
          <input name="duration_minutes" type="number" min={0} placeholder="Thời gian (phút)" className="rounded-xl border border-black/10 bg-background px-3 py-2" />
          <textarea name="notes" placeholder="Ghi chú" className="rounded-xl border border-black/10 bg-background px-3 py-2 md:col-span-3" />
          <button className="rounded-xl bg-accent-strong px-4 py-2 text-white md:col-span-4">Lưu bài thi</button>
        </form>
      </section>
    </div>
  );
}
