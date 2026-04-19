import Link from "next/link";

export default function OauthConsentPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-6 md:p-8">
        <h1 className="font-pixel text-retro-yellow text-base md:text-lg mb-4">OAuth Consent</h1>

        <p className="font-pixel text-retro-lightgray text-[9px] leading-loose mb-4">
          Questlog uses secure OAuth providers (like Google) to let you sign in quickly without sharing your
          password directly with this app.
        </p>

        <p className="font-pixel text-retro-lightgray text-[9px] leading-loose mb-6">
          When you continue, your provider may share basic profile details (such as name, email, and avatar)
          so we can create and maintain your account.
        </p>

        <div className="bg-retro-black border-2 border-retro-darkpurple p-4 mb-6">
          <h2 className="font-pixel text-retro-cyan text-[9px] mb-3">What we use this data for</h2>
          <ul className="font-pixel text-retro-lightgray text-[8px] leading-loose space-y-2 list-disc pl-4">
            <li>Account creation and sign-in</li>
            <li>Saving your quest progress and profile</li>
            <li>Securing access to your personal data</li>
          </ul>
        </div>

        <div className="flex flex-wrap gap-3">
          <Link
            href="/auth"
            className="font-pixel text-[8px] px-4 py-3 uppercase tracking-wider bg-retro-blue text-retro-white hover:bg-retro-lightblue"
          >
            Continue to Login
          </Link>
          <Link
            href="/privacy"
            className="font-pixel text-[8px] px-4 py-3 uppercase tracking-wider bg-retro-darkpurple text-retro-white hover:bg-retro-purple"
          >
            Privacy Policy
          </Link>
          <Link
            href="/terms"
            className="font-pixel text-[8px] px-4 py-3 uppercase tracking-wider bg-retro-darkgray text-retro-lightgray hover:text-retro-white"
          >
            Terms
          </Link>
        </div>
      </div>
    </div>
  );
}
