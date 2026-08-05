import * as React from "react";
import { motion } from "motion/react";

export interface MotionAccordionItem {
  question: React.ReactNode;
  answer: React.ReactNode;
}

export interface MotionAccordionProps {
  items: MotionAccordionItem[];
  /** @default 12 */
  gap?: number;
  className?: string;
  defaultOpenIndex?: number | null;
}

function AccordionItem({
  item,
  isOpen,
  onToggle,
  itemId,
  panelId,
}: {
  item: MotionAccordionItem;
  isOpen: boolean;
  onToggle: () => void;
  itemId: string;
  panelId: string;
}) {
  const contentRef = React.useRef<HTMLDivElement>(null);
  const [contentH, setContentH] = React.useState(0);

  React.useEffect(() => {
    const el = contentRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setContentH(el.scrollHeight));
    ro.observe(el);
    setContentH(el.scrollHeight);
    return () => ro.disconnect();
  }, []);

  return (
    <motion.div
      layout
      className={`overflow-hidden rounded-[24px] border bg-white text-slate-900 transition-colors duration-200 ${
        isOpen
          ? "border-blue-600 ring-2 ring-blue-500/10 shadow-md"
          : "border-slate-200/80 shadow-sm hover:border-slate-300 hover:shadow"
      }`}
      transition={{ type: "spring", stiffness: 280, damping: 28, mass: 0.9 }}
      animate={{ scale: isOpen ? 1 : 0.985 }}
      initial={false}
      style={{ originX: 0.5, originY: 0 }}
    >
      <button
        id={itemId}
        type="button"
        aria-controls={panelId}
        aria-expanded={isOpen}
        onClick={onToggle}
        className="flex w-full cursor-pointer select-none items-center justify-between gap-4 px-6 py-5 text-left"
      >
        <span
          className={`text-sm lg:text-base font-bold tracking-tight leading-snug transition-colors ${
            isOpen ? "text-blue-600" : "text-slate-800"
          }`}
        >
          {item.question}
        </span>

        <motion.span
          aria-hidden="true"
          initial={false}
          animate={{
            rotate: isOpen ? 180 : 0,
            scale: isOpen ? 1.05 : 1,
          }}
          transition={{ type: "spring", stiffness: 480, damping: 28 }}
          className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full transition-colors ${
            isOpen ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-500"
          }`}
        >
          {isOpen ? (
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 2"
              fill="none"
              aria-hidden
            >
              <path
                d="M1 1h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          ) : (
            <svg
              width="14"
              height="14"
              viewBox="0 0 14 14"
              fill="none"
              aria-hidden
            >
              <path
                d="M7 1v12M1 7h12"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
              />
            </svg>
          )}
        </motion.span>
      </button>

      <motion.div
        id={panelId}
        role="region"
        aria-labelledby={itemId}
        animate={{
          height: isOpen ? contentH : 0,
          opacity: isOpen ? 1 : 0,
        }}
        initial={false}
        transition={{
          height: { type: "spring", stiffness: 340, damping: 34, mass: 0.9 },
          opacity: { duration: 0.2, ease: "easeOut" },
        }}
        style={{ overflow: "hidden" }}
      >
        <motion.div
          ref={contentRef}
          animate={{ y: isOpen ? 0 : -8 }}
          transition={{
            type: "spring",
            stiffness: 360,
            damping: 30,
            mass: 0.8,
          }}
          className="px-6 pb-6 pt-1"
        >
          <div className="text-xs lg:text-sm leading-relaxed font-medium text-slate-600 border-t border-slate-100 pt-3">
            {item.answer}
          </div>
        </motion.div>
      </motion.div>
    </motion.div>
  );
}

export function MotionAccordion({
  items,
  gap = 12,
  className = "",
  defaultOpenIndex = 0,
}: MotionAccordionProps) {
  const rawId = React.useId();
  const baseId = `accordion-${rawId.replace(/:/g, "")}`;

  const [openIndex, setOpenIndex] = React.useState<number | null>(defaultOpenIndex);

  const toggle = (i: number) => setOpenIndex((prev) => (prev === i ? null : i));

  return (
    <div className={`w-full ${className}`}>
      <div className="flex flex-col" style={{ gap }}>
        {items.map((item, i) => (
          <AccordionItem
            key={i}
            item={item}
            isOpen={openIndex === i}
            onToggle={() => toggle(i)}
            itemId={`${baseId}-trigger-${i}`}
            panelId={`${baseId}-panel-${i}`}
          />
        ))}
      </div>
    </div>
  );
}
