import { createClient } from "@/lib/supabase/server";
import { isSupabaseConfigured } from "@/lib/supabase/config";
import { addTaskAction, toggleTaskAction } from "./actions";

export default async function PlannerPage() {
  if (!isSupabaseConfigured()) return <p role="alert">Chưa cấu hình Supabase.</p>;
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [tasksRes, doneRes] = await Promise.all([
    supabase.from("study_tasks").select("id,title,duration_minutes,skill").eq("task_date", today).eq("archived", false).order("created_at"),
    supabase.from("task_completions").select("task_id").eq("completed_on", today),
  ]);
  const tasks = tasksRes.data ?? [];
  const doneIds = new Set((doneRes.data ?? []).map((d) => d.task_id));
  const doneCount = tasks.filter((t) => doneIds.has(t.id)).length;
  const percent = tasks.length ? Math.round((doneCount / tasks.length) * 100) : 0;
  const minutesDone = tasks.filter((t) => doneIds.has(t.id)).reduce((s, t) => s + t.duration_minutes, 0);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent-strong">Kế hoạch hằng ngày</h1>
        <p className="text-sm text-foreground/70">Hôm nay ({today}) · Hoàn thành {doneCount}/{tasks.length} · {percent}% · {minutesDone} phút</p>
        <div className="mt-3 h-2 overflow-hidden rounded-full bg-beige">
          <div className="h-full rounded-full bg-accent transition-all" style={{ width: `${percent}%` }} />
        </div>
      </header>

      <section className="rounded-3xl bg-card p-6 shadow-sm">
        {tasks.length === 0 ? (
          <p className="text-sm text-foreground/70">Chưa có việc nào hôm nay. Thêm việc đầu tiên bên dưới, ví dụ: “Học 10 từ mới” hoặc “Nghe một phần Listening”.</p>
        ) : (
          <ul className="space-y-2">
            {tasks.map((t) => {
              const done = doneIds.has(t.id);
              return (
                <li key={t.id}>
                  <form action={toggleTaskAction} className="flex items-center gap-3">
                    <input type="hidden" name="taskId" value={t.id} />
                    <input type="hidden" name="day" value={today} />
                    <button type="submit" aria-pressed={done}
                      className={`flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm transition-colors ${done ? "bg-soft line-through text-foreground/60" : "bg-background hover:bg-soft"}`}>
                      <span>{done ? "✓ " : "○ "}{t.title}</span>
                      <span className="text-xs text-foreground/60">{t.duration_minutes} phút</span>
                    </button>
                  </form>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="rounded-3xl bg-card p-6 shadow-sm">
        <h2 className="font-semibold">Thêm việc hôm nay</h2>
        <form action={addTaskAction} className="mt-4 grid gap-3 md:grid-cols-3">
          <input name="title" required placeholder="Tên việc" className="rounded-xl border border-black/10 bg-background px-3 py-2 md:col-span-2" />
          <input name="duration_minutes" type="number" min={0} max={600} defaultValue={15} className="rounded-xl border border-black/10 bg-background px-3 py-2" />
          <select name="skill" className="rounded-xl border border-black/10 bg-background px-3 py-2">
            <option value="general">Chung</option>
            <option value="vocabulary">Từ vựng</option>
            <option value="listening">Listening</option>
            <option value="reading">Reading</option>
            <option value="writing">Writing</option>
            <option value="speaking">Speaking</option>
            <option value="grammar">Ngữ pháp</option>
          </select>
          <button className="rounded-xl bg-accent-strong px-4 py-2 text-white md:col-span-2">Thêm việc</button>
        </form>
      </section>
    </div>
  );
}
