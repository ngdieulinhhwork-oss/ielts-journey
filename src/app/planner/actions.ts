"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const addTaskSchema = z.object({
  title: z.string().trim().min(1, "Nhập tên việc cần làm").max(300),
  duration_minutes: z.coerce.number().int().min(0).max(600).default(15),
  skill: z.enum(["listening", "reading", "writing", "speaking", "vocabulary", "grammar", "general"]).default("general"),
});

export async function addTaskAction(formData: FormData) {
  const parsed = addTaskSchema.safeParse({
    title: formData.get("title"),
    duration_minutes: formData.get("duration_minutes") || 15,
    skill: formData.get("skill") || "general",
  });
  if (!parsed.success) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;
  const today = new Date().toISOString().slice(0, 10);
  await supabase.from("study_tasks").insert({
    user_id: user.id,
    title: parsed.data.title,
    task_date: today,
    duration_minutes: parsed.data.duration_minutes,
    skill: parsed.data.skill,
    source: "manual",
  });
  revalidatePath("/planner");
}

/** Bật/tắt hoàn thành một việc trong ngày. Lưu vào task_completions (unique theo task và ngày). */
export async function toggleTaskAction(formData: FormData) {
  const taskId = String(formData.get("taskId") ?? "");
  const day = String(formData.get("day") ?? "");
  if (!taskId || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: existing } = await supabase
    .from("task_completions")
    .select("id")
    .eq("task_id", taskId)
    .eq("completed_on", day)
    .maybeSingle();

  if (existing) {
    await supabase.from("task_completions").delete().eq("id", existing.id);
  } else {
    await supabase.from("task_completions").insert({ user_id: user.id, task_id: taskId, completed_on: day, minutes_spent: 0 });
  }
  revalidatePath("/planner");
}
