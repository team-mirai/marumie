/**
 * @jest-environment jsdom
 */
import { act, fireEvent, render, screen } from "@testing-library/react";
import { ResearchFundComingSoonForm } from "@/client/components/politicians/ResearchFundComingSoonForm";
import { setPoliticianResearchFundComingSoon } from "@/server/contexts/shared/presentation/actions/manage-politician";

jest.mock("@/server/contexts/shared/presentation/actions/manage-politician", () => ({
  setPoliticianResearchFundComingSoon: jest.fn(),
}));
const refresh = jest.fn();
jest.mock("next/navigation", () => ({ useRouter: () => ({ refresh }) }));
jest.mock("sonner", () => ({
  toast: { success: jest.fn(), error: jest.fn(), warning: jest.fn() },
}));

const setComingSoon = setPoliticianResearchFundComingSoon as jest.Mock;

beforeEach(() => {
  jest.clearAllMocks();
});

describe("ResearchFundComingSoonForm", () => {
  it("準備中にしていない議員は、スイッチを入れると添え書きを入力でき、保存で添え書きを送る", async () => {
    setComingSoon.mockResolvedValue({ success: true, cacheWarning: null });
    render(<ResearchFundComingSoonForm id="1" comingSoonNote={null} />);

    const toggle = screen.getByRole("switch");
    expect(toggle.getAttribute("aria-checked")).toBe("false");
    expect(screen.queryByLabelText("添え書き（任意）")).toBeNull();

    fireEvent.click(toggle);
    fireEvent.change(screen.getByLabelText("添え書き（任意）"), {
      target: { value: "12月中旬に公開予定" },
    });
    await act(async () => {
      fireEvent.click(screen.getByRole("button", { name: "保存" }));
    });

    expect(setComingSoon).toHaveBeenCalledWith("1", "12月中旬に公開予定");
    expect(refresh).toHaveBeenCalled();
  });

  it("準備中の議員のスイッチを切ると、添え書きの入力を待たずに解除を保存する", async () => {
    setComingSoon.mockResolvedValue({ success: true, cacheWarning: null });
    render(<ResearchFundComingSoonForm id="1" comingSoonNote="準備中です" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("switch"));
    });

    expect(setComingSoon).toHaveBeenCalledWith("1", null);
    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
  });

  it("解除の保存に失敗したらスイッチを入れた状態に戻す", async () => {
    setComingSoon.mockResolvedValue({ success: false, error: "保存に失敗しました" });
    render(<ResearchFundComingSoonForm id="1" comingSoonNote="準備中です" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("switch"));
    });

    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("true");
    expect(refresh).not.toHaveBeenCalled();
  });

  it("キャッシュの更新だけに失敗したときは保存できているので、スイッチを戻さない", async () => {
    setComingSoon.mockResolvedValue({ success: true, cacheWarning: "接続に失敗しました" });
    render(<ResearchFundComingSoonForm id="1" comingSoonNote="準備中です" />);

    await act(async () => {
      fireEvent.click(screen.getByRole("switch"));
    });

    expect(screen.getByRole("switch").getAttribute("aria-checked")).toBe("false");
  });
});
