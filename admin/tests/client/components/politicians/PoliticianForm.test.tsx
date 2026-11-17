/**
 * @jest-environment jsdom
 */
import { render, screen } from "@testing-library/react";
import { PoliticianForm } from "@/client/components/politicians/PoliticianForm";

// 保存はサーバーアクションを読み込むので、表示だけを確かめるテストでは代役にする
jest.mock("@/server/contexts/shared/presentation/actions/manage-politician", () => ({
  savePolitician: jest.fn(),
}));
jest.mock("next/navigation", () => ({
  useRouter: () => ({ push: jest.fn(), refresh: jest.fn() }),
}));
jest.mock("@/client/components/common/SnsUrlsField", () => ({
  SnsUrlsField: () => null,
}));

describe("PoliticianForm", () => {
  it("ふりがな欄に、議員の並び順に使われることを添える", () => {
    render(<PoliticianForm organizations={[]} />);

    const hintId = screen.getByLabelText("ふりがな").getAttribute("aria-describedby");
    expect(hintId).not.toBeNull();
    expect(document.getElementById(hintId ?? "")?.textContent).toBe(
      "議員の並び順（あいうえお順）に使われます",
    );
  });
});
