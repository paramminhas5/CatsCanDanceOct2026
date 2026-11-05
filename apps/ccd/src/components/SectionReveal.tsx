import { ReactNode } from "react";

const SectionReveal = ({ children, className, id }: { children: ReactNode; className?: string; id?: string }) => (
  <div id={id} className={className}>
    {children}
  </div>
);

export default SectionReveal;
