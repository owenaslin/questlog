import Link from "next/link";

export default function OauthConsentPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-6 md:p-8">
        <h1 className="text-heading text-retro-yellow mb-4">OAuth Consent</h1>

        <p className="text-body text-retro-lightgray leading-relaxed mb-4">
          Questlog uses secure OAuth providers (like Google) to let you sign in quickly without sharing your
          password directly with this app.
        </p>

        <p className="text-body text-retro-lightgray leading-relaxed mb-6">
          When you continue, your provider may share basic profile details (such as name, email, and avatar)
          so we can create and maintain your account.
        </p>

        <div className="bg-retro-black border-2 border-retro-darkpurple p-4 mb-6">
          <h2 className="text-body-sm font-semibold text-retro-cyan mb-3">What we use this data for</h2>
          <ul className="text-body-sm text-retro-lightgray leading-relaxed space-y-2 list-disc pl-4">
            <li>Account creation and sign-in</li>
            <li>Saving your quest progress and profile</li>
            <li>Securing access to your personal data</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/auth"
            className="text-body-sm font-medium px-4 py-3 min-h-[44px] uppercase bg-retro-blue text-retro-white hover:bg-retro-lightblue"
          >
            Continue to Login
          </Link>
          <Link
            href="/privacy"
            className="text-body-sm font-medium px-4 py-3 min-h-[44px] uppercase bg-retro-darkpurple text-retro-white hover:bg-retro-purple"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="text-body-sm font-medium px-4 py-3 min-h-[44px] uppercase bg-retro-darkgray text-retro-lightgray hover:text-retro-white"
          >
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
}
