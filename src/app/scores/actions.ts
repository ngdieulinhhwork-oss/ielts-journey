"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const band = z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().min(0).max(9).refine((n) => Number.isInteger(n * 2), "Điểm phải theo bước 0.5").optional());

const schema = z.object({
  attempt_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Ngày không hợp lệ"),
  label: z.string().trim().max(200).optional(),
  listening_band: band,
  reading_band: band,
  writing_band: band,
  speaking_band: band,
  duration_minutes: z.preprocess((v) => (v === "" || v == null ? undefined : Number(v)), z.number().int().min(0).max(1000).optional()),
  notes: z.string().trim().max(2000).optional(),
});

/** Nguồn điểm mặc định là practice_estimate (ước lượng khi tự làm bài). */
export async function addAttemptAction(formData: FormData) {
  const parsed = schema.safeParse({
    attempt_date: formData.get("attempt_date"),
    label: formData.get("label") || undefined,
    listening_band: formData.get("listening_band"),
    reading_band: formData.get("reading_band"),
    writing_band: formData.get("writing_band"),
    speaking_band: formData.get("speaking_band"),
    duration_minutes: formData.get("duration_minutes"),
    notes: formData.get("notes") || undefined,
  });
  if (!parsed.success) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return;

  const d = parsed.data;
  const sourceFor = (b: number | undefined) => (b === undefined ? null : "practice_estimate");
  await supabase.from("test_attempts").insert({
    user_id: user.id,
    label: d.label ?? null,
    attempt_date: d.attempt_date,
    listening_band: d.listening_band ?? null,
    reading_band: d.reading_band ?? null,
    writing_band: d.writing_band ?? null,
    speaking_band: d.speaking_band ?? null,
    listening_source: sourceFor(d.listening_band),
    reading_source: sourceFor(d.reading_band),
    writing_source: sourceFor(d.writing_band),
    speaking_source: sourceFor(d.speaking_band),
    duration_minutes: d.duration_minutes ?? null,
    notes: d.notes ?? null,
    status: "completed",
  });
  revalidatePath("/scores");
  revalidatePath("/");
}
