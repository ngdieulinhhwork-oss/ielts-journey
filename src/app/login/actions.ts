"use server";

import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

const credentialsSchema = z.object({
  email: z.string().trim().email("Email không hợp lệ"),
  password: z.string().min(8, "Mật khẩu cần ít nhất 8 ký tự").max(72, "Mật khẩu quá dài"),
});

function fail(mode: string, message: string): never {
  redirect(`/login?mode=${mode}&error=${encodeURIComponent(message)}`);
}

export async function signInAction(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) fail("signin", parsed.error.issues[0].message);

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) fail("signin", "Email hoặc mật khẩu không đúng");
  redirect("/");
}

export async function signUpAction(formData: FormData) {
  const parsed = credentialsSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) fail("signup", parsed.error.issues[0].message);

  const supabase = await createClient();
  const { error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
  });
  if (error) fail("signup", "Không thể tạo tài khoản. Email có thể đã được dùng.");
  redirect("/login?mode=signin&message=" + encodeURIComponent("Tài khoản đã được tạo. Hãy kiểm tra email xác nhận (nếu có) rồi đăng nhập."));
}

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}
