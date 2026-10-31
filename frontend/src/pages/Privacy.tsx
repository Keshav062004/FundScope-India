import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'What we collect',
    content: 'When you sign in, we collect your Google account email address and name, along with a session cookie to keep you logged in.',
  },
  {
    title: 'How we use it',
    content: 'We use this information only to let you sign in and use the dashboard. We do not sell or share your data.',
  },
  {
    title: 'Storage',
    content: 'Session data is stored in the app’s database and expires after 7 days.',
  },
  {
    title: 'Third parties',
    content: 'Sign-in uses Google and Firebase. Market data comes from MFapi.in. AI features use Google Gemini.',
  },
  {
    title: 'Your choices',
    content: 'You can sign out at any time. To request deletion of your account data, email keshavgarg072004@gmail.com.',
  },
  {
    title: 'Educational use',
    content: 'FundScope India is for educational analytics only. It is not investment advice.',
  },
];

export default function Privacy() {
  return (
    <main
      className="relative min-h-screen overflow-hidden px-4 py-20 sm:px-8"
      style={{ background: 'radial-gradient(ellipse at 18% 0%,var(--brand-surface),transparent 38%),var(--page-plane)' }}
    >
      <Link to="/" className="absolute left-5 top-5 text-[12px] font-medium ink-secondary transition hover:text-white sm:left-8 sm:top-7">
        Back to home
      </Link>
      <article
        className="mx-auto w-full max-w-3xl rounded-2xl border p-6 sm:p-10"
        style={{ borderColor: 'var(--border-strong)', background: 'var(--surface)', boxShadow: 'var(--shadow-lg)' }}
      >
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Privacy Policy</h1>
        <div className="mt-8 space-y-6">
          {sections.map((section) => (
            <section key={section.title}>
              <h2 className="text-base font-semibold text-[var(--text-primary)]">{section.title}</h2>
              <p className="mt-2 text-[13px] leading-6 ink-secondary">{section.content}</p>
            </section>
          ))}
          <p className="border-t pt-5 text-[11px] ink-muted" style={{ borderColor: 'var(--border)' }}>
            Last updated: 31/10/2026.
          </p>
        </div>
      </article>
    </main>
  );
}
