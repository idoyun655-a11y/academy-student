import { supabase, qs, toast, signOut } from "./supabase_client.js";

qs("#logoutBtn").addEventListener("click", signOut);

function trRow(values){
  const tr = document.createElement("tr");
  values.forEach(v=>{
    const td = document.createElement("td");
    td.textContent = v ?? "";
    tr.appendChild(td);
  });
  return tr;
}

async function ensureSession(){
  const { data: { session } } = await supabase.auth.getSession();
  if (session) return session;

  const { data, error } = await supabase.auth.signInAnonymously();
  if (error) throw error;
  return data.session;
}

async function getProfile(user_id){
  const { data, error } = await supabase
    .from("profiles")
    .select("role,name")
    .eq("user_id", user_id)
    .maybeSingle();
  if (error) throw error;
  return data;
}

async function getLinkedStudentIds(user_id){
  const { data, error } = await supabase
    .from("student_links")
    .select("student_id")
    .eq("parent_user_id", user_id);
  if (error) throw error;
  return (data || []).map(x=>x.student_id);
}

async function loadStudentData(student_id){
  const { data: att } = await supabase
    .from("attendance")
    .select("date,status,note")
    .eq("student_id", student_id)
    .order("date", { ascending:false })
    .limit(30);

  const counts = { 출석:0, 지각:0, 결석:0, 조퇴:0 };
  const attBody = qs("#attTable tbody"); attBody.innerHTML = "";
  att.forEach(a=>{
    attBody.appendChild(trRow([a.date, a.status, a.note || ""]));
    if (counts[a.status] !== undefined) counts[a.status]++;
  });
  qs("#attSummary").innerHTML =
    `<b>출석</b> ${counts.출석} · <b>지각</b> ${counts.지각} · <b>결석</b> ${counts.결석} · <b>조퇴</b> ${counts.조퇴}`;

  const { data: hw } = await supabase
    .from("homework")
    .select("due_date,title,status")
    .eq("student_id", student_id)
    .order("created_at", { ascending:false })
    .limit(30);
  const hwBody = qs("#hwTable tbody"); hwBody.innerHTML = "";
  hw.forEach(h=> hwBody.appendChild(trRow([h.due_date || "", h.title, h.status])));

  const { data: gr } = await supabase
    .from("grades")
    .select("exam_name,score,max_score")
    .eq("student_id", student_id)
    .order("created_at", { ascending:false })
    .limit(30);
  const grBody = qs("#grTable tbody"); grBody.innerHTML = "";
  gr.forEach(g=> grBody.appendChild(trRow([g.exam_name, String(g.score), String(g.max_score)])));

  qs("#gradeSummary").innerHTML = gr.length
    ? `<b>${gr[0].exam_name}</b> ${gr[0].score}/${gr[0].max_score}`
    : "데이터 없음";
}

(async ()=>{
  try{
    const session = await ensureSession();

    const prof = await getProfile(session.user.id);
    qs("#miniRole").textContent = prof?.role ? (prof.role === "parent" ? "부모" : "학생") : "미연결";
    qs("#miniName").textContent = prof?.name || "이름 미설정";

    const ids = await getLinkedStudentIds(session.user.id);
    if (!ids.length){
      qs("#empty").style.display = "block";
      qs("#dataArea").style.display = "none";
      return;
    }

    qs("#empty").style.display = "none";
    qs("#dataArea").style.display = "block";
    await loadStudentData(ids[0]);

  } catch(e){
    toast(e.message || String(e));
  }
})();
