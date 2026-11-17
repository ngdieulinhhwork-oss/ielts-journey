import Link from "next/link";
import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { writingFeedbackSchema } from "@/lib/ai/writing-grader";

export default async function GraderResultPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from("writing_submissions")
    .select("id,task_type,prompt,essay,word_count,created_at")
    .eq("id", id)
    .maybeSingle();
  if (!sub) notFound();

  const { data: fb } = await supabase
    .from("writing_feedback")
    .select("task_achievement,coherence_cohesion,lexical_resource,grammar_accuracy,overall_band,details,model")
    .eq("submission_id", id)
    .maybeSingle();
  const details = fb ? writingFeedbackSchema.safeParse(fb.details) : null;

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link href="/grader" className="text-sm underline">← Chấm bài khác</Link>
      <h1 className="text-2xl font-semibold text-accent-strong">Kết quả chấm Writing Task {sub.task_type}</h1>
      <p className="text-sm text-foreground/70">Đây là ước lượng bằng AI ({fb?.model ?? "không rõ"}), không phải điểm chính thức.</p>

      {fb && details?.success ? (
        <>
          <section className="grid grid-cols-2 gap-3 md:grid-cols-5">
            {[
              ["Task Response", fb.task_achievement],
              ["Coherence", fb.coherence_cohesion],
              ["Lexical", fb.lexical_resource],
              ["Grammar", fb.grammar_accuracy],
              ["Overall (ước lượng)", fb.overall_band],
            ].map(([label, value]) => (
              <div key={String(label)} className="rounded-2xl bg-soft p-4">
                <p className="text-xs text-foreground/70">{label}</p>
                <p className="text-xl font-semibold">{Number(value).toFixed(1)}</p>
              </div>
            ))}
          </section>
          <section className="rounded-3xl bg-card p-6 shadow-sm">
            <h2 className="font-semibold">Nhận xét</h2>
            <p className="mt-2 text-sm">{details.data.summary_vi}</p>
            <h3 className="mt-4 font-medium">Điểm mạnh</h3>
            <ul className="list-disc pl-5 text-sm">{details.data.strengths_vi.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </section>
          <section className="rounded-3xl bg-card p-6 shadow-sm">
            <h2 className="font-semibold">Lỗi cần sửa</h2>
            {details.data.issues.length === 0 ? (
              <p className="mt-2 text-sm text-foreground/70">AI không tìm thấy lỗi đáng kể.</p>
            ) : (
              <ul className="mt-2 space-y-3 text-sm">
                {details.data.issues.map((is, i) => (
                  <li key={i} className="rounded-2xl bg-soft p-3">
                    <p className="font-medium">[{is.category}] “{is.quote}”</p>
                    <p>{is.explanation_vi}</p>
                    <p className="text-foreground/70">Gợi ý: {is.suggestion_vi}</p>
                  </li>
                ))}
              </ul>
            )}
          </section>
          <section className="rounded-3xl bg-card p-6 shadow-sm">
            <h2 className="font-semibold">Ví dụ viết lại</h2>
            <p className="mt-2 whitespace-pre-line text-sm">{details.data.improved_example_en}</p>
            <h3 className="mt-4 font-medium">Bài tập gợi ý</h3>
            <ul className="list-disc pl-5 text-sm">{details.data.recommended_exercises_vi.map((s, i) => <li key={i}>{s}</li>)}</ul>
          </section>
        </>
      ) : (
        <p role="alert" className="rounded-2xl bg-beige p-4 text-sm">Chưa có kết quả chấm hợp lệ cho bài này.</p>
      )}

      <details className="rounded-3xl bg-card p-6 shadow-sm">
        <summary className="cursor-pointer font-medium">Bài làm của bạn ({sub.word_count} từ)</summary>
        <p className="mt-3 whitespace-pre-line text-sm">{sub.essay}</p>
      </details>
    </div>
  );
}
