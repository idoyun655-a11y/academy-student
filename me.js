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

function drawMockChart(points){
  const canvas = qs("#mockChart");
  const ctx = canvas.getContext("2d");
  const W = canvas.width, H = canvas.height;
  ctx.clearRect(0,0,W,H);

  // padding
  const padL=44, padR=16, padT=16, padB=34;
  const x0=padL, x1=W-padR, y0=padT, y1=H-padB;

  // grid (1~9, 1 top)
  ctx.globalAlpha = 0.9;
  ctx.font = "12px system-ui";
  for(let g=1; g<=9; g++){
    const y = y0 + (g-1)*(y1-y0)/8;
    ctx.strokeStyle = "rgba(255,255,255,.08)";
    ctx.beginPath(); ctx.moveTo(x0,y); ctx.lineTo(x1,y); ctx.stroke();
    ctx.fillStyle = "rgba(232,238,252,.55)";
    ctx.fillText(`${g}등급`, 6, y+4);
  }

  // x labels
  const months = ["3월","6월","9월","11월"];
  months.forEach((m,i)=>{
    const x = x0 + i*(x1-x0)/3;
    ctx.fillStyle="rgba(232,238,252,.55)";
    ctx.fillText(m, x-10, H-12);
  });

  // line
  const map = {3:0,6:1,9:2,11:3};
  const pts = points
    .filter(p=>map[p.month]!==undefined)
    .sort((a,b)=>map[a.month]-map[b.month])
    .map(p=>{
      const i = map[p.month];
      const x = x0 + i*(x1-x0)/3;
      const y = y0 + (p.grade-1)*(y1-y0)/8;
      return {x,y,grade:p.grade};
    });

  if(!pts.length) return;

  ctx.strokeStyle="rgba(242,201,76,.85)";
  ctx.lineWidth=2;
  ctx.beginPath();
  ctx.moveTo(pts[0].x, pts[0].y);
  for(let i=1;i<pts.length;i++) ctx.lineTo(pts[i].x, pts[i].y);
  ctx.stroke();

  pts.forEach(p=>{
    ctx.fillStyle="rgba(242,201,76,1)";
    ctx.beginPath(); ctx.arc(p.x,p.y,4,0,Math.PI*2); ctx.fill();
  });
}

async function loadStudentData(student_id){
  // attendance
  const { data: att, error: e1 } = await supabase
    .from("attendance")
    .select("date,status,note")
    .eq("student_id", student_id)
    .order("date", { ascending:false })
    .limit(30);
  if (e1) throw e1;

  const counts = { 출석:0, 지각:0, 결석:0, 조퇴:0 };
  const attBody = qs("#attTable tbody"); attBody.innerHTML = "";
  (att||[]).forEach(a=>{
    attBody.appendChild(trRow([a.date, a.status, a.note || ""]));
    if (counts[a.status] !== undefined) counts[a.status]++;
  });
  qs("#attSummary").innerHTML =
    `출석 ${counts.출석} · 지각 ${counts.지각} · 결석 ${counts.결석} · 조퇴 ${counts.조퇴}`;

  // homework
  const { data: hw, error: e2 } = await supabase
    .from("homework")
    .select("due_date,title,status")
    .eq("student_id", student_id)
    .order("created_at", { ascending:false })
    .limit(10);
  if (e2) throw e2;

  const hwBody = qs("#hwTable tbody"); hwBody.innerHTML = "";
  (hw||[]).forEach(h=> hwBody.appendChild(trRow([h.due_date || "", h.title, h.status])));
  const pending = (hw||[]).filter(h=>h.status!=="완료").length;
  qs("#hwSummary").innerHTML = `최근 10건 중 미완료 ${pending}개`;

  // grades (english)
  const { data: school, error: e3 } = await supabase
    .from("english_school_grades")
    .select("school_year,semester,exam_type,score,grade")
    .eq("student_id", student_id)
    .order("created_at", { ascending:false })
    .limit(10);
  if(e3) throw e3;

  const { data: mock, error: e4 } = await supabase
    .from("english_mock_grades")
    .select("year,month,score,grade")
    .eq("student_id", student_id)
    .order("year",{ascending:false})
    .order("month",{ascending:true});
  if(e4) throw e4;

  const schoolBody = qs("#schoolTbl tbody"); schoolBody.innerHTML="";
  (school||[]).forEach(r=>{
    schoolBody.appendChild(trRow([`${r.school_year}학년 ${r.semester}학기`, r.exam_type, String(r.score), `${r.grade}`]));
  });

  // mock table: show latest year only if multiple years
  const latestYear = (mock||[]).reduce((m,r)=>Math.max(m,r.year), 0);
  const mockLatest = (mock||[]).filter(r=>r.year===latestYear);
  const mockBody = qs("#mockTbl tbody"); mockBody.innerHTML="";
  const monthOrder=[3,6,9,11];
  monthOrder.forEach(m=>{
    const r = mockLatest.find(x=>x.month===m);
    mockBody.appendChild(trRow([`${m}월`, r?String(r.grade):"-", r?String(r.score):"-"]));
  });

  drawMockChart(mockLatest.map(r=>({month:r.month, grade:r.grade})));

  qs("#gradeCard").style.display = "block";
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
      qs("#gradeCard").style.display = "none";
      return;
    }

    qs("#empty").style.display = "none";
    qs("#dataArea").style.display = "block";
    await loadStudentData(ids[0]);

  } catch(e){
    toast(e.message || String(e));
  }
})();
