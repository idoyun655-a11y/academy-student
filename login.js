import { supabase, qs, toast } from "./supabase_client.js";

qs("#loginBtn").addEventListener("click", async ()=>{
  try{
    const email = qs("#email").value.trim();
    const password = qs("#pw").value;
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if(error) throw error;
    location.href = "me.html";
  }catch(e){ toast(e.message || String(e)); }
});

qs("#signupBtn").addEventListener("click", async ()=>{
  try{
    const email = qs("#email").value.trim();
    const password = qs("#pw").value;
    const { error } = await supabase.auth.signUp({ email, password });
    if(error) throw error;
    toast("회원가입 완료! 이제 로그인 눌러줘.");
  }catch(e){ toast(e.message || String(e)); }
});

qs("#linkBtn").addEventListener("click", async ()=>{
  try{
    const { data: { session } } = await supabase.auth.getSession();
    if(!session) return toast("먼저 로그인해야 해.");
    const p_role = qs("#role").value;
    const p_name = qs("#name").value.trim();
    const p_code = qs("#code").value.trim();
    if(!p_name) return toast("이름 입력!");
    if(!p_code) return toast("코드 입력!");
    const { error } = await supabase.rpc("redeem_access_code", { p_code, p_role, p_name });
    if(error) throw error;
    toast("연결 완료!");
    location.href = "me.html";
  }catch(e){ toast(e.message || String(e)); }
});
