export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="bg-retro-darkgray border-4 border-retro-black shadow-pixel p-6 md:p-8">
        <h1 className="text-heading text-retro-yellow mb-4">Terms of Service</h1>

        <p className="text-body text-retro-lightgray leading-relaxed mb-4">
          By using Questlog, you agree to use the app responsibly and in compliance with applicable laws.
        </p>

        <div className="space-y-4">
          <section>
            <h2 className="text-body-sm font-semibold text-retro-cyan mb-2">Account Responsibility</h2>
            <p className="text-body-sm text-retro-lightgray leading-relaxed">
              You are responsible for maintaining the security of your account and credentials.
            </p>
          </section>

          <section>
            <h2 className="text-body-sm font-semibold text-retro-cyan mb-2">Acceptable Use</h2>
            <p className="text-body-sm text-retro-lightgray leading-relaxed">
              Do not misuse the service, attempt unauthorized access, or interfere with normal operation.
            </p>
          </section>

          <section>
            <h2 className="text-body-sm font-semibold text-retro-cyan mb-2">Service Availability</h2>
            <p className="text-body-sm text-retro-lightgray leading-relaxed">
              Questlog is provided &ldquo;as is&rdquo; and may change over time as features are updated.
            </p>
          </section>

          <section>
            <h2 className="text-body-sm font-semibold text-retro-cyan mb-2">Limitation of Liability</h2>
            <p className="text-body-sm text-retro-lightgray leading-relaxed">
              The app owner is not liable for indirect or incidental damages arising from use of the service.
            </p>
          </section>
        </div>

        <p className="text-body-sm text-retro-gray mt-6">Last updated: April 2026</p>
      </div>
    </div>
  );
}
