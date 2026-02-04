import { supabase, qs, toast } from "./supabase_client.js";

async function ensureAnonSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

qs("#linkBtn").addEventListener("click", async () => {
  try {
    await ensureAnonSession();

    const p_role = qs("#role").value;
    const p_name = qs("#name").value.trim();
    const p_code = qs("#code").value.trim();

    if (!p_name) return toast("이름 입력!");
    if (!p_code) return toast("코드 입력!");

    const { error } = await supabase.rpc("redeem_access_code", { p_code, p_role, p_name });
    if (error) throw error;

    toast("연결 완료!");
    location.href = "me.html";
  } catch (e) {
    toast(e.message || String(e));
  }
});

(async () => {
  try { await ensureAnonSession(); } catch {}
})();
