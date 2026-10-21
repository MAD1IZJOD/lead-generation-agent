import { createClient } from "./supabase/server";

export async function signIn(email: string, password: string) {
  const supabase = await createClient();
  return supabase.auth.signInWithPassword({ email, password });
}

export async function signUp(email: string, password: string) {
  const supabase = await createClient();
  return supabase.auth.signUp({ email, password });
}

export async function signOut() {
  const supabase = await createClient();
  return supabase.auth.signOut();
}

export async function getSession() {
  const supabase = await createClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentUser() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
}
