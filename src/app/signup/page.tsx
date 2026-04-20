import { redirect } from "next/navigation";
import { buildAuthUrl } from "@/lib/auth-redirect";

type Props = { searchParams: Promise<{ redirect?: string }> };

export default async function SignupPage({ searchParams }: Props) {
  const { redirect: redirectTo } = await searchParams;
  redirect(buildAuthUrl("signup", redirectTo));
}
