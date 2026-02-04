import { supabase, qs, toast, signOut } from "./supabase_client.js";
qs("#logoutBtn").addEventListener("click", signOut);

async function requireLogin(){
  const { data: { session } } = await supabase.auth.getSession();
  if(!session) location.href = "login.html";
  return session;
}

async function getProfile(user_id){
  const { data, error } = await supabase.from("profiles").select("role,name").eq("user_id", user_id).maybeSingle();
  if(error) throw error;
  return data;
}

async function getLinkedStudentIds(user_id){
  const { data, error } = await supabase.from("student_links").select("student_id").eq("parent_user_id", user_id);
  if(error) throw error;
  return (data||[]).map(x=>x.student_id);
}

function trRow(values){
  const tr=document.createElement("tr");
  values.forEach(v=>{const td=document.createElement("td"); td.textContent=v; tr.appendChild(td);});
  return tr;
}

(async ()=>{
  try{
    const session = await requireLogin();
    qs("#who").textContent = session.user.email;

    const prof = await getProfile(session.user.id);
    qs("#role").textContent = prof ? `${prof.role} · ${prof.name}` : "프로필 없음(연결 필요)";

    const ids = await getLinkedStudentIds(session.user.id);
    if(!ids.length){
      qs("#empty").style.display="block";
      return;
    }
    qs("#dataArea").style.display="block";
    const student_id = ids[0];

    const { data: att, error: e1 } = await supabase.from("attendance").select("date,status,note").eq("student_id", student_id).order("date", {ascending:false}).limit(30);
    if(e1) throw e1;
    const attBody = qs("#attTable tbody"); attBody.innerHTML="";
    const counts={출석:0,지각:0,결석:0,조퇴:0};
    att.forEach(a=>{ attBody.appendChild(trRow([a.date, a.status, a.note||""])); if(counts[a.status]!==undefined) counts[a.status]++; });
    qs("#attSummary").innerHTML = `<b>출석</b> ${counts.출석} · <b>지각</b> ${counts.지각} · <b>결석</b> ${counts.결석} · <b>조퇴</b> ${counts.조퇴}`;

    const { data: hw, error: e2 } = await supabase.from("homework").select("due_date,title,status").eq("student_id", student_id).order("created_at", {ascending:false}).limit(30);
    if(e2) throw e2;
    const hwBody = qs("#hwTable tbody"); hwBody.innerHTML="";
    hw.forEach(h=> hwBody.appendChild(trRow([h.due_date||"", h.title, h.status])));

    const { data: gr, error: e3 } = await supabase.from("grades").select("exam_name,score,max_score").eq("student_id", student_id).order("created_at", {ascending:false}).limit(30);
    if(e3) throw e3;
    const grBody = qs("#grTable tbody"); grBody.innerHTML="";
    gr.forEach(g=> grBody.appendChild(trRow([g.exam_name, String(g.score), String(g.max_score)])));
    qs("#gradeSummary").innerHTML = gr.length ? `<b>${gr[0].exam_name}</b> ${gr[0].score}/${gr[0].max_score}` : "데이터 없음";

  }catch(e){ toast(e.message || String(e)); }
})();
