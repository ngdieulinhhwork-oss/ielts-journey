import { isOpenAIConfigured } from "@/lib/ai/status";
import { gradeWritingAction } from "./actions";

type SearchParams = Promise<{ error?: string }>;

export default async function GraderPage({ searchParams }: { searchParams: SearchParams }) {
  const { error } = await searchParams;
  const configured = isOpenAIConfigured();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent-strong">Chấm bài bằng AI</h1>
        <p className="text-sm text-foreground/70">
          Chấm Writing bằng AI. Đây là điểm ước lượng, không phải điểm chính thức của giám khảo IELTS.
        </p>
      </header>

      {!configured && (
        <div role="alert" className="rounded-2xl bg-beige p-4 text-sm">
          <p className="font-medium">Chưa cấu hình AI</p>
          <p className="mt-1 text-foreground/70">Thêm OPENAI_API_KEY vào file .env.local rồi khởi động lại app.</p>
        </div>
      )}
      {error && <p role="alert" className="rounded-xl bg-beige p-3 text-sm text-red-800">{error}</p>}

      <form action={gradeWritingAction} className="space-y-4 rounded-3xl bg-card p-6 shadow-sm">
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Loại bài</span>
          <select name="taskType" className="w-full rounded-xl border border-black/10 bg-background px-3 py-2">
            <option value="2">Task 2 (essay)</option>
            <option value="1">Task 1 (biểu đồ, bảng)</option>
          </select>
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Đề bài</span>
          <textarea name="prompt" required rows={3} className="w-full rounded-xl border border-black/10 bg-background px-3 py-2" />
        </label>
        <label className="block text-sm">
          <span className="mb-1 block font-medium">Bài làm</span>
          <textarea name="essay" required rows={12} className="w-full rounded-xl border border-black/10 bg-background px-3 py-2" />
        </label>
        <button
          type="submit"
          disabled={!configured}
          className="rounded-xl bg-accent-strong px-4 py-2.5 font-medium text-white disabled:opacity-50"
        >
          Chấm bài
        </button>
      </form>
    </div>
  );
}
