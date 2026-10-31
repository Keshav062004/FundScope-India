import { Link } from 'react-router-dom';

const sections = [
  {
    title: 'Educational use only',
    content: 'FundScope India provides educational analytics and is not investment advice.',
  },
  {
    title: 'Data and performance',
    content: 'Historical data may be incomplete or delayed. Past performance does not predict future results.',
  },
  {
    title: 'Accounts',
    content: 'You are responsible for keeping your login secure.',
  },
  {
    title: 'Acceptable use',
    content: 'Do not abuse the AI features or attempt to disrupt the service.',
  },
  {
    title: 'No warranty',
    content: 'The service is provided as is.',
  },
  {
    title: 'Contact',
    content: 'For questions, email keshavgarg072004@gmail.com.',
  },
];

export default function Terms() {
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
        <h1 className="text-3xl font-bold tracking-tight text-[var(--text-primary)]">Terms of Use</h1>
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
