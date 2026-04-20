import { redirect } from "next/navigation";
import { buildAuthUrl } from "@/lib/auth-redirect";

type Props = { searchParams: Promise<{ redirect?: string }> };

export default async function LoginPage({ searchParams }: Props) {
  const { redirect: redirectTo } = await searchParams;
  redirect(buildAuthUrl("login", redirectTo));
}
