import { Bot, ExternalLink } from "lucide-react";

const COACHES = [
  { name: "Vocabulary Coach", desc: "Hướng dẫn học từ vựng mỗi ngày", url: "https://chatgpt.com/g/g-67608fa6a8f881918dff6afa11301df4-vocabulary-coach" },
  { name: "Vocabulary Expert", desc: "Giúp tra từ chi tiết, cụ thể", url: "https://chatgpt.com/g/g-67385362a6c48191a7fb813bf94a4bfa-vocabulary-expert" },
  { name: "Your Grammar Coach", desc: "Giúp học ngữ pháp mỗi ngày", url: "https://chatgpt.com/g/g-6760930f6a7c8191b571eee7de57c14c-your-grammar-coach" },
  { name: "Grade your IELTS Speaking", desc: "Giúp chấm Speaking IELTS", url: "https://chatgpt.com/g/g-2DNF8ArXs-grade-your-ielts-speaking" },
  { name: "Tập giao tiếp tiếng Anh", desc: "Dành cho các bạn lấy lại gốc", url: "https://chatgpt.com/g/g-69ac365dbd38819192ce875f7d80eb8d-tap-giao-tiep-tieng-anh-hieu-qua-moi-ngay" },
  { name: "Band Mate", desc: "Tìm ra lỗi trong cách viết và đề xuất lộ trình sửa cụ thể", url: "https://chatgpt.com/g/g-690dfeff566881919321b843472b44fa-band-mate" },
];

export default function NotesPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <header>
        <h1 className="text-2xl font-semibold text-accent-strong">Ghi chú & AI Coaches</h1>
        <p className="text-sm text-foreground/70">Các GPT bên ngoài. Hội thoại ở đó không tự đồng bộ vào website này.</p>
      </header>
      <ul className="grid gap-3 md:grid-cols-2">
        {COACHES.map((c) => (
          <li key={c.url}>
            <a href={c.url} target="_blank" rel="noopener noreferrer"
              className="flex items-start gap-3 rounded-3xl bg-card p-5 shadow-sm transition-colors hover:bg-soft">
              <Bot className="mt-0.5 h-5 w-5 shrink-0 text-accent-strong" aria-hidden />
              <span className="flex-1">
                <span className="block font-medium">{c.name}</span>
                <span className="block text-sm text-foreground/70">{c.desc}</span>
              </span>
              <ExternalLink className="h-4 w-4 text-foreground/50" aria-hidden />
            </a>
          </li>
        ))}
      </ul>
    </div>
  );
}
