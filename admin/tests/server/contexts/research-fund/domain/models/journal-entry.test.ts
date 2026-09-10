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
          (status === "approved" && nextStatus === "published")
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
