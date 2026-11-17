import { CalendarCheck, Sprout, Target, LogOut } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { signOutAction } from "./login/actions";

type Band = number | null;

export default async function Home() {
  if (!isSupabaseConfigured()) {
    return (
      <div role="alert" className="mx-auto max-w-3xl rounded-2xl bg-beige p-6">
        <p className="font-medium">Chưa cấu hình Supabase</p>
        <p className="mt-1 text-sm text-foreground/70">Xem file .env.example để biết cần điền những biến nào.</p>
      </div>
    );
  }

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const nowIso = new Date().toISOString();

  const [profileRes, attemptsRes, vocabCountRes, dueRes] = await Promise.all([
    supabase.from("profiles").select("display_name,target_overall,target_listening,target_reading,target_writing,target_speaking").eq("id", user!.id).maybeSingle(),
    supabase.from("test_attempts").select("attempt_date,overall_band,listening_band,reading_band,writing_band,speaking_band").order("attempt_date", { ascending: false }).limit(5),
    supabase.from("vocabulary").select("id", { count: "exact", head: true }),
    supabase.from("vocabulary").select("id", { count: "exact", head: true }).lte("next_review_at", nowIso),
  ]);

  const profile = profileRes.data;
  const attempts = attemptsRes.data ?? [];
  const latest = attempts[0];
  const overallTarget = Number(profile?.target_overall ?? 6.5);
  const current = latest?.overall_band != null ? Number(latest.overall_band) : null;
  const vocabTotal = vocabCountRes.count ?? 0;
  const dueWords = dueRes.count ?? 0;

  const skills: { key: string; label: string; band: Band; target: number }[] = [
    { key: "listening", label: "Listening", band: latest?.listening_band ?? null, target: Number(profile?.target_listening ?? 6.5) },
    { key: "reading", label: "Reading", band: latest?.reading_band ?? null, target: Number(profile?.target_reading ?? 6.5) },
    { key: "writing", label: "Writing", band: latest?.writing_band ?? null, target: Number(profile?.target_writing ?? 6.0) },
    { key: "speaking", label: "Speaking", band: latest?.speaking_band ?? null, target: Number(profile?.target_speaking ?? 6.0) },
  ];

  return (
    <div className="mx-auto max-w-5xl space-y-6">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold text-accent-strong">
            Chào {profile?.display_name ?? "bạn"}, hôm nay mình học tiếp nhé
          </h1>
          <p className="text-foreground/70">Mục tiêu của bạn: IELTS Overall {overallTarget.toFixed(1)}</p>
        </div>
        <form action={signOutAction}>
          <button type="submit" className="flex items-center gap-2 rounded-xl border border-black/10 bg-card px-3 py-2 text-sm hover:bg-soft">
            <LogOut className="h-4 w-4" aria-hidden /> Đăng xuất
          </button>
        </form>
      </header>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-3xl bg-card p-6 shadow-sm md:col-span-1">
          <div className="flex items-center gap-3">
            <Target className="h-6 w-6 text-accent" aria-hidden />
            <h2 className="font-semibold">Overall hiện tại</h2>
          </div>
          {current !== null ? (
            <>
              <p className="mt-3 text-4xl font-semibold text-accent-strong">{current.toFixed(1)}</p>
              <p className="text-sm text-foreground/70">
                Còn {Math.max(0, overallTarget - current).toFixed(1)} điểm để đạt mục tiêu
              </p>
            </>
          ) : (
            <p className="mt-3 text-sm text-foreground/70">
              Chưa có điểm đầy đủ 4 kỹ năng. Overall chỉ được tính khi đủ Listening, Reading, Writing và Speaking.
            </p>
          )}
        </div>

        <div className="rounded-3xl bg-card p-6 shadow-sm md:col-span-2">
          <h2 className="font-semibold">Điểm theo kỹ năng (bài gần nhất)</h2>
          <div className="mt-4 grid grid-cols-2 gap-3">
            {skills.map((s) => (
              <div key={s.key} className="rounded-2xl bg-soft p-4">
                <p className="text-sm text-foreground/70">{s.label}</p>
                <p className="text-xl font-semibold">{s.band !== null ? Number(s.band).toFixed(1) : "—"}</p>
                <p className="text-xs text-foreground/60">Mục tiêu {s.target.toFixed(1)}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-2">
        <div className="rounded-3xl bg-soft p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <Sprout className="h-6 w-6 text-accent-strong" aria-hidden />
            <h2 className="font-semibold">Từ vựng</h2>
          </div>
          {vocabTotal > 0 ? (
            <p className="mt-3 text-sm">Bạn có {vocabTotal} từ, {dueWords} từ đến hạn ôn hôm nay.</p>
          ) : (
            <p className="mt-3 text-sm text-foreground/70">Bạn chưa có từ nào. Hãy thêm từ đầu tiên trong mục Từ vựng.</p>
          )}
        </div>
        <div className="rounded-3xl bg-card p-6 shadow-sm">
          <div className="flex items-center gap-3">
            <CalendarCheck className="h-6 w-6 text-accent" aria-hidden />
            <h2 className="font-semibold">Bài thi gần đây</h2>
          </div>
          {attempts.length > 0 ? (
            <ul className="mt-3 space-y-2 text-sm">
              {attempts.map((a, i) => (
                <li key={i} className="flex justify-between">
                  <span>{a.attempt_date}</span>
                  <span>Overall {a.overall_band != null ? Number(a.overall_band).toFixed(1) : "chưa đủ điểm"}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="mt-3 text-sm text-foreground/70">Chưa có bài thi nào được ghi lại.</p>
          )}
        </div>
      </section>
    </div>
  );
}
