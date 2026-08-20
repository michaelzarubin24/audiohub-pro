export default function PrivacyPage() {
  return (
    <div className="container mx-auto max-w-3xl px-4 py-12 space-y-6 text-sm text-muted-foreground leading-relaxed">
      <h1 className="text-2xl sm:text-3xl font-extrabold text-foreground tracking-tight">
        Privacy Policy
      </h1>
      <p>Last updated: August 2026</p>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-foreground">
          1. Audio Processing & Privacy
        </h2>
        <p>
          AudioHub processes audio files locally inside your browser using
          client-side Web Audio DSP technology. We do not store, listen to, or
          share your uploaded audio files on our servers.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-foreground">
          2. Cookies & Advertising
        </h2>
        <p>
          We use third-party advertising partners, including Google AdSense, to
          serve ads when you visit our website. These companies may use cookies
          and web beacons to serve ads based on prior visits to this or other
          websites.
        </p>
      </section>

      <section className="space-y-2">
        <h2 className="text-base font-bold text-foreground">3. Contact Us</h2>
        <p>
          If you have questions regarding this privacy policy, you can reach us
          via our official support channels.
        </p>
      </section>
    </div>
  );
}
