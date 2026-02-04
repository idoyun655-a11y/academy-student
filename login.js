import { supabase, qs, toast } from "./supabase_client.js";

// ✅ 이메일 없이: 버튼 누르면 익명 계정 생성(자동 가입)
async function ensureAnonSession() {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

qs("#linkBtn").addEventListener("click", async () => {
  try {
    // 1) 익명 로그인(자동 가입)
    await ensureAnonSession();

    // 2) 코드로 연결
    const p_role = qs("#role").value;      // student / parent
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

// (선택) 이미 세션이 있고 연결된 상태면 바로 내정보로
(async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (session) {
    // 그냥 me로 보내도 됨 (연결 안 됐으면 me에서 안내 뜸)
    // location.href = "me.html";
  }
})();
