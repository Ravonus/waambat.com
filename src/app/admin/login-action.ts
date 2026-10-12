"use server";
import { AuthError } from "next-auth";
import { signIn } from "~/server/auth";
export async function backupSignIn(_state: string, form: FormData) {
  try {
    await signIn("credentials", {
      username: form.get("username"),
      password: form.get("password"),
      redirectTo: "/admin",
    });
  } catch (error) {
    if (error instanceof AuthError)
      return "Unable to sign in. Check your credentials or try again later.";
    throw error;
  }
  return "";
}
