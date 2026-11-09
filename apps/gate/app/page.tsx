/**
 * The Host front page, from the landing board W35-LandGate (renamed Host): make the night, sell and
 * list it, run the door, get paid, with the guest list, the door and the report shown working.
 * The markup and look are the board's; see packages/ui/src/boards/land-host.ts.
 */
import { Landing } from "@ccd/ui";
import FitWidth from "@ccd/ui/FitWidth";
import { html } from "@ccd/ui/boards/land-host";

export default function HostFront() {
  return (
    <>
      <Landing html={html} tryHref="/make" />
      <FitWidth selector=".w35 > .f" min={820} />
    </>
  );
}
