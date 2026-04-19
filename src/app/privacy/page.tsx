export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-6 md:p-8">
        <h1 className="font-pixel text-retro-yellow text-base md:text-lg mb-4">Privacy Policy</h1>

        <p className="font-pixel text-retro-lightgray text-[9px] leading-loose mb-4">
          Questlog collects only the data needed to provide core functionality: account login, quest progress,
          profile stats, and app personalization.
        </p>

        <div className="space-y-4">
          <section>
            <h2 className="font-pixel text-retro-cyan text-[9px] mb-2">Data We Collect</h2>
            <p className="font-pixel text-retro-lightgray text-[8px] leading-loose">
              Basic account information (name, email, avatar), quest and profile activity, and optional content
              you submit in the app.
            </p>
          </section>

          <section>
            <h2 className="font-pixel text-retro-cyan text-[9px] mb-2">How We Use Data</h2>
            <p className="font-pixel text-retro-lightgray text-[8px] leading-loose">
              To authenticate users, save progress, display profile stats, and improve reliability and security.
            </p>
          </section>

          <section>
            <h2 className="font-pixel text-retro-cyan text-[9px] mb-2">Third-Party Services</h2>
            <p className="font-pixel text-retro-lightgray text-[8px] leading-loose">
              Questlog uses Supabase for authentication/storage and may use Google APIs for optional AI-powered
              quest generation.
            </p>
          </section>

          <section>
            <h2 className="font-pixel text-retro-cyan text-[9px] mb-2">Contact</h2>
            <p className="font-pixel text-retro-lightgray text-[8px] leading-loose">
              For privacy requests, contact the repository/application owner.
            </p>
          </section>
        </div>

        <p className="font-pixel text-retro-gray text-[7px] mt-6">Last updated: April 2026</p>
      </div>
    </div>
  );
}
