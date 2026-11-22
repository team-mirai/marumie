import { JournalEntry } from "@/server/contexts/research-fund/domain/models/journal-entry";

describe("JournalEntry.transition", () => {
  const statuses = ["draft", "approved", "published"] as const;
  for (const status of statuses) {
    for (const nextStatus of statuses) {
      it(`${status} → ${nextStatus}`, () => {
        const entry: JournalEntry = { status };
        const result = JournalEntry.transition(entry, nextStatus);
        if (
          (status === "draft" && nextStatus === "approved") ||
          (status === "approved" && nextStatus === "draft") ||
          (status === "approved" && nextStatus === "published") ||
          (status === "published" && nextStatus === "approved")
        ) {
          expect(result).toEqual({ status: "valid", value: { status: nextStatus } });
        } else {
          expect(result).toMatchObject({
            status: "invalid",
            errors: [{ code: "RF_INVALID_STATUS_TRANSITION", path: "status", severity: "error" }],
          });
        }
        expect(entry.status).toBe(status);
      });
    }
  }

  it("型の外から渡る不正な状態を拒否する", () => {
    expect(
      JournalEntry.transition({ status: "unknown" as JournalEntry["status"] }, "approved").status,
    ).toBe("invalid");
    expect(
      JournalEntry.transition({ status: "draft" }, "unknown" as JournalEntry["status"]).status,
    ).toBe("invalid");
  });
});

describe("JournalEntry.initialStatus", () => {
  it("手入力と読み取りの仕訳は下書きで、支給は確認済で作る", () => {
    expect(JournalEntry.initialStatus("manual")).toBe("draft");
    expect(JournalEntry.initialStatus("scan")).toBe("draft");
    expect(JournalEntry.initialStatus("grant")).toBe("approved");
  });
});
