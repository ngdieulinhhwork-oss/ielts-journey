"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { nextReviewAt, sm2 } from "@/lib/srs";

const addSchema = z.object({
  term: z.string().trim().min(1, "Nhập từ hoặc cụm từ").max(200),
  meaning_vi: z.string().trim().max(500).optional(),
  example: z.string().trim().max(500).optional(),
  topic: z.string().trim().max(100).optional(),
});

export async function addWordAction(formData: FormData) {
  const parsed = addSchema.safeParse({
    term: formData.get("term"),
    meaning_vi: formData.get("meaning_vi") || undefined,
    example: formData.get("example") || undefined,
    topic: formData.get("topic") || undefined,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const now = new Date();
  await supabase.from("vocabulary").insert({
    user_id: user.id,
    term: parsed.data.term,
    meaning_vi: parsed.data.meaning_vi ?? null,
    example: parsed.data.example ?? null,
    topic: parsed.data.topic ?? null,
    status: "new",
    first_learned_at: now.toISOString(),
    next_review_at: now.toISOString(),
  });
  revalidatePath("/vocabulary");
}

export async function reviewWordAction(formData: FormData) {
  const id = String(formData.get("id") ?? "");
  const quality = Number(formData.get("quality"));
  if (!id || Number.isNaN(quality)) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const { data: word } = await supabase
    .from("vocabulary")
    .select("id,ease_factor,interval_days,repetitions,lapses")
    .eq("id", id)
    .maybeSingle();
  if (!word) return;

  const before = { easeFactor: Number(word.ease_factor), intervalDays: word.interval_days, repetitions: word.repetitions };
  const after = sm2(before, quality);
  const now = new Date();
  const status = after.repetitions === 0 ? "learning" : after.repetitions >= 4 ? "mastered" : "reviewing";

  await supabase.from("vocabulary").update({
    ease_factor: after.easeFactor,
    interval_days: after.intervalDays,
    repetitions: after.repetitions,
    lapses: quality < 3 ? word.lapses + 1 : word.lapses,
    status,
    last_reviewed_at: now.toISOString(),
    next_review_at: nextReviewAt(now, after.intervalDays).toISOString(),
  }).eq("id", id);

  await supabase.from("vocabulary_reviews").insert({
    user_id: user.id,
    vocabulary_id: id,
    quality: Math.round(quality),
    mode: "flashcard",
    previous_interval: before.intervalDays,
    new_interval: after.intervalDays,
    ease_factor: after.easeFactor,
  });
  revalidatePath("/vocabulary");
}
