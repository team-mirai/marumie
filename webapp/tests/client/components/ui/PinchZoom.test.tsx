import { renderToStaticMarkup } from "react-dom/server";
import PinchZoom from "@/client/components/ui/PinchZoom";

describe("PinchZoom", () => {
  it("全体表示のときは「拡大」ボタンを出し、「全体を表示」は出さない", () => {
    const html = renderToStaticMarkup(
      <PinchZoom>
        <svg />
      </PinchZoom>,
    );
    expect(html).toContain('aria-label="図を拡大する"');
    expect(html).not.toContain("全体を表示");
  });

  it("「指を広げて拡大」の案内は既定で出し、読み上げからは隠す", () => {
    const html = renderToStaticMarkup(
      <PinchZoom>
        <svg />
      </PinchZoom>,
    );
    expect(html).toMatch(/<p class="pinch-zoom-hint" aria-hidden="true">.*指を広げて拡大<\/p>/);
  });

  it("hint={false} なら案内を出さない（ボタンは出す）", () => {
    const html = renderToStaticMarkup(
      <PinchZoom hint={false}>
        <svg />
      </PinchZoom>,
    );
    expect(html).not.toContain("指を広げて拡大");
    expect(html).toContain('aria-label="図を拡大する"');
  });
});
