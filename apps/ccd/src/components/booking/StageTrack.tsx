/** Request status, as a pill or as a five-step track: Sent, Seen, Answer, Accepted, Confirmed. */
import { STAGE_LABEL, STAGE_TONE, stageStep, type Stage } from "@/lib/desk";

export function StagePill({ stage, className = "" }: { stage: Stage; className?: string }) {
  return <span className={`inline-block text-xs font-bold px-2 py-0.5 border-2 border-ink ${STAGE_TONE[stage] ?? "bg-cream"} ${className}`}>{STAGE_LABEL[stage] ?? stage}</span>;
}

export default function StageTrack({ stage }: { stage: Stage }) {
  const closed = stage === "declined" || stage === "cancelled";
  const at = stageStep(stage);
  const steps = ["Sent", "Seen", stage === "countered" ? "Counter" : stage === "declined" ? "Declined" : "Interested", "Accepted", "Confirmed"];
  return (
    <ol className="grid grid-cols-5 border-4 border-ink bg-cream" aria-label={`Status: ${STAGE_LABEL[stage]}`}>
      {steps.map((s, i) => {
        const done = !closed ? i <= at : i < at || (stage === "declined" && i === 2);
        const here = i === at && !(stage === "cancelled");
        return (
          <li key={s} aria-current={here ? "step" : undefined}
            className={`px-1.5 py-2 text-center text-[11px] sm:text-sm font-bold leading-tight border-ink ${i > 0 ? "border-l-2" : ""} ${
              here && stage === "declined" ? "bg-ink/10 text-ink/70 line-through" : here ? (stage === "confirmed" ? "bg-magenta text-cream" : "bg-acid-yellow") : done ? "bg-ink text-cream" : "text-ink/45"
            }`}>
            {s}
          </li>
        );
      })}
      {stage === "cancelled" && <li className="col-span-5 border-t-2 border-ink px-3 py-1.5 text-sm font-bold">Withdrawn by the organiser.</li>}
    </ol>
  );
}
