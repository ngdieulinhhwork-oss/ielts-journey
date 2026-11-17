"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { estimateOverall, gradeWriting, getOpenAIConfig } from "@/lib/ai/writing-grader";

const schema = z.object({
  taskType: z.enum(["1", "2"]),
  prompt: z.string().trim().min(10, "Đề bài quá ngắn").max(4000),
  essay: z.string().trim().min(50, "Bài viết cần ít nhất 50 từ để chấm").max(12000),
});

function wordCount(text: string) {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export async function gradeWritingAction(formData: FormData) {
  if (!getOpenAIConfig()) {
    redirect(`/grader?error=${encodeURIComponent("Chưa cấu hình OPENAI_API_KEY. Thêm key vào .env.local rồi khởi động lại app.")}`);
  }

  const parsed = schema.safeParse({
    taskType: formData.get("taskType"),
    prompt: formData.get("prompt"),
    essay: formData.get("essay"),
  });
  if (!parsed.success) {
    redirect(`/grader?error=${encodeURIComponent(parsed.error.issues[0].message)}`);
  }
  const { taskType, prompt, essay } = parsed.data;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  let feedback;
  try {
    feedback = await gradeWriting({ taskType: Number(taskType) as 1 | 2, prompt, essay });
  } catch (e) {
    redirect(`/grader?error=${encodeURIComponent(e instanceof Error ? e.message : "Chấm bài thất bại")}`);
  }

  const { data: submission, error: subErr } = await supabase
    .from("writing_submissions")
    .insert({
      user_id: user.id,
      task_type: Number(taskType),
      prompt,
      essay,
      word_count: wordCount(essay),
      status: "submitted",
    })
    .select("id")
    .single();
  if (subErr || !submission) redirect(`/grader?error=${encodeURIComponent("Không lưu được bài viết")}`);

  const { error: fbErr } = await supabase.from("writing_feedback").insert({
    user_id: user.id,
    submission_id: submission.id,
    task_achievement: feedback.task_achievement,
    coherence_cohesion: feedback.coherence_cohesion,
    lexical_resource: feedback.lexical_resource,
    grammar_accuracy: feedback.grammar_accuracy,
    overall_band: estimateOverall(feedback),
    details: feedback,
    model: getOpenAIConfig()!.model,
  });
  if (fbErr) redirect(`/grader?error=${encodeURIComponent("Không lưu được kết quả chấm")}`);

  redirect(`/grader/${submission.id}`);
}
