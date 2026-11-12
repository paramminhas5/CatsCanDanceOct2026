/**
 * A product landing page rendered straight from its W35 board (packages/ui/src/boards/land-*.ts), with
 * the board's own CSS scoped under .w35 (@ccd/ui/w35.css). Data goes in through {{TOKENS}}.
 * Pair it with <FitWidth selector=".w35 > .f" min={820} />: the 1440 board zooms to fit laptops and reflows on phones.
 * Links the board drew as "#" (the little app screens) go to `tryHref`, the real thing they show.
 */
import { fill } from "./board";

export function Landing({ html, tokens = {}, tryHref }: { html: string; tokens?: Record<string, string>; tryHref?: string }) {
  const body = tryHref ? html.split('href="#"').join(`href="${tryHref}"`) : html;
  return <div className="w35" dangerouslySetInnerHTML={{ __html: fill(body, tokens) }} />;
}
