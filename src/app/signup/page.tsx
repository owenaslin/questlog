"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { buildAuthUrl } from "@/lib/auth-redirect";

export default function SignupPage() {
  const router = useRouter();
  const [continueHref, setContinueHref] = useState(buildAuthUrl("signup"));

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const nextHref = buildAuthUrl("signup", params.get("redirect") || undefined);
    setContinueHref(nextHref);
    router.replace(nextHref);
  }, [router]);

  return (
    <div className="max-w-md mx-auto mt-10 text-center">
      <p className="font-pixel text-retro-lightgray text-[9px] mb-4">Redirecting to signup...</p>
      <Link href={continueHref} className="font-pixel text-retro-cyan text-[8px] hover:text-retro-lightblue">
        Continue
      </Link>
    </div>
  );
}
