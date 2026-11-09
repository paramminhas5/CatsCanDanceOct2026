/**
 * The Host front page, built from the board W39-Host (scroll version): the hero with the floating
 * phones, the seven steps that pin and swap as you scroll, the house-party block, what it costs and
 * the closing call. The markup and motion are the board's; see packages/ui/src/boards/host.ts.
 */
import { Board, boardVars } from "@ccd/ui";
import FitWidth from "@ccd/ui/FitWidth";
import { parts } from "@ccd/ui/boards/host";
import { PRODUCTS } from "@ccd/brand";

export default function HostFront() {
  return (
    <>
      <Board parts={parts} vars={boardVars(PRODUCTS.gate.colour)} />
      <FitWidth />
    </>
  );
}
