export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-6 md:p-8">
        <h1 className="text-heading text-retro-yellow mb-4">Privacy Policy</h1>

        <p className="text-body text-retro-lightgray leading-relaxed mb-4">
          Questlog collects only the data needed to provide core functionality: account login, quest progress,
          profile stats, and app personalization.
        </p>

        <div className="space-y-4">
          <section>
            <h2 className="text-body-sm font-semibold text-retro-cyan mb-2">Data We Collect</h2>
            <p className="text-body-sm text-retro-lightgray leading-relaxed">
              Basic account information (name, email, avatar), quest and profile activity, and optional content
              you submit in the app.
            </p>
          </section>

          <section>
            <h2 className="text-body-sm font-semibold text-retro-cyan mb-2">How We Use Data</h2>
            <p className="text-body-sm text-retro-lightgray leading-relaxed">
              To authenticate users, save progress, display profile stats, and improve reliability and security.
            </p>
          </section>

          <section>
            <h2 className="text-body-sm font-semibold text-retro-cyan mb-2">Third-Party Services</h2>
            <p className="text-body-sm text-retro-lightgray leading-relaxed">
              Questlog uses Supabase for authentication/storage and may use Google APIs for optional AI-powered
              quest generation.
            </p>
          </section>

          <section>
            <h2 className="text-body-sm font-semibold text-retro-cyan mb-2">Contact</h2>
            <p className="text-body-sm text-retro-lightgray leading-relaxed">
              For privacy requests, contact the repository/application owner.
            </p>
          </section>
        </div>

        <p className="text-body-sm text-retro-gray mt-6">Last updated: April 2026</p>
      </div>
    </div>
  );
}
