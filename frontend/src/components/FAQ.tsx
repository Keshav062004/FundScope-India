import { useState } from 'react';
import { ChevronDown } from 'lucide-react';

export type FAQItem = { question: string; answer: string };

function FAQRow({ item, open, onToggle, id }: { item: FAQItem; open: boolean; onToggle: () => void; id: string }) {
  return (
    <div className="border-b" style={{ borderColor: 'rgba(205,221,239,.08)' }}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={`${id}-answer`}
        id={`${id}-question`}
        className="flex w-full items-center justify-between gap-4 py-5 text-left"
      >
        <span className="text-[14px] font-semibold text-[#e2e9f1] sm:text-[15px]">{item.question}</span>
        <ChevronDown
          size={17}
          className="shrink-0 transition-transform duration-200"
          style={{ color: '#74dfbf', transform: open ? 'rotate(180deg)' : 'rotate(0deg)' }}
        />
      </button>
      <div
        id={`${id}-answer`}
        role="region"
        aria-labelledby={`${id}-question`}
        className="grid overflow-hidden transition-[grid-template-rows] duration-200 ease-out"
        style={{ gridTemplateRows: open ? '1fr' : '0fr' }}
      >
        <div className="min-h-0">
          <p className="max-w-2xl pb-5 text-[12.5px] leading-6 text-[#9aaab9]">{item.answer}</p>
        </div>
      </div>
    </div>
  );
}

export default function FAQ({ items }: { items: FAQItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(0);

  return (
    <div className="mx-auto max-w-3xl">
      {items.map((item, index) => (
        <FAQRow
          key={item.question}
          id={`faq-${index}`}
          item={item}
          open={openIndex === index}
          onToggle={() => setOpenIndex((current) => (current === index ? null : index))}
        />
      ))}
    </div>
  );
}
