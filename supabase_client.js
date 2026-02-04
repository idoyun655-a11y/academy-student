import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm";
import { SUPABASE_URL, SUPABASE_ANON_KEY } from "./config.js";

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export function qs(sel){ return document.querySelector(sel); }
export function toast(msg){ alert(msg); }

export async function signOut(){
  await supabase.auth.signOut();
  location.href = "login.html";
}

export function fmtDate(d){
  const x = new Date(d);
  const yyyy = x.getFullYear();
  const mm = String(x.getMonth()+1).padStart(2,"0");
  const dd = String(x.getDate()).padStart(2,"0");
  return `${yyyy}-${mm}-${dd}`;
}
