import { z } from "zod";

const bandSchema = z.number().min(0).max(9);

export const writingFeedbackSchema = z.object({
  task_achievement: bandSchema,
  coherence_cohesion: bandSchema,
  lexical_resource: bandSchema,
  grammar_accuracy: bandSchema,
  summary_vi: z.string().min(1),
  strengths_vi: z.array(z.string()).max(10),
  issues: z
    .array(
      z.object({
        category: z.enum(["grammar", "vocabulary", "coherence", "task"]),
        quote: z.string(),
        explanation_vi: z.string(),
        suggestion_vi: z.string(),
      }),
    )
    .max(30),
  improved_example_en: z.string(),
  recommended_exercises_vi: z.array(z.string()).max(10),
});

export type WritingFeedback = z.infer<typeof writingFeedbackSchema>;

/** IELTS rounds the average of criteria to the nearest 0.5 (x.25 -> x.5, x.75 -> next whole). */
export function ieltsRound(value: number): number {
  const whole = Math.floor(value);
  const frac = value - whole;
  if (frac < 0.25) return whole;
  if (frac < 0.75) return whole + 0.5;
  return whole + 1;
}

export function estimateOverall(f: Pick<WritingFeedback, "task_achievement" | "coherence_cohesion" | "lexical_resource" | "grammar_accuracy">) {
  return ieltsRound((f.task_achievement + f.coherence_cohesion + f.lexical_resource + f.grammar_accuracy) / 4);
}

export function getOpenAIConfig() {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;
  return { apiKey, model: process.env.OPENAI_MODEL ?? "gpt-4o-mini" };
}

const SYSTEM_PROMPT = `Bạn là giám khảo IELTS Writing. Chấm bài theo 4 tiêu chí: Task Response (task_achievement), Coherence and Cohesion, Lexical Resource, Grammatical Range and Accuracy. Mỗi tiêu chí chấm theo thang 0–9 với bước 0.5.
Đây chỉ là ước lượng, không phải điểm chính thức của giám khảo.
Trả về DUY NHẤT một JSON object đúng schema:
{
 "task_achievement": number, "coherence_cohesion": number, "lexical_resource": number, "grammar_accuracy": number,
 "summary_vi": string, "strengths_vi": string[],
 "issues": [{"category":"grammar|vocabulary|coherence|task","quote":string,"explanation_vi":string,"suggestion_vi":string}],
 "improved_example_en": string, "recommended_exercises_vi": string[]
}
Giải thích và gợi ý viết bằng tiếng Việt. Chỉ trích dẫn đúng từ bài làm; không bịa lỗi nếu bài không có lỗi.`;

export async function gradeWriting(input: { taskType: 1 | 2; prompt: string; essay: string }): Promise<WritingFeedback> {
  const config = getOpenAIConfig();
  if (!config) throw new Error("Chưa cấu hình OPENAI_API_KEY");

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: { Authorization: `Bearer ${config.apiKey}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: config.model,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        {
          role: "user",
          content: `Task ${input.taskType}\nĐề bài:\n${input.prompt}\n\nBài làm:\n${input.essay}`,
        },
      ],
    }),
  });

  if (!res.ok) throw new Error(`AI trả về lỗi (${res.status}). Thử lại sau.`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const content = data.choices?.[0]?.message?.content;
  if (!content) throw new Error("AI không trả về nội dung chấm.");

  const parsed = writingFeedbackSchema.safeParse(JSON.parse(content));
  if (!parsed.success) throw new Error("Kết quả AI không đúng định dạng. Thử lại.");
  return parsed.data;
}
