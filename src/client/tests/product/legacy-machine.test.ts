import { it, expect } from "vitest";
import { createActor } from "xstate";
import { serviceOrderMachine } from "../../sdk/state/src/machines/serviceOrderMachine.ts";
it("legacy payout cannot complete a validated order without required evidence", () => {
  const initial = createActor(serviceOrderMachine).getSnapshot();
  const snapshot = serviceOrderMachine.resolveState({
    value: "validated",
    context: { ...initial.context, photos: [] },
  });
  const actor = createActor(serviceOrderMachine, { snapshot });
  actor.start();
  actor.send({
    type: "SETTLE_PAYOUT",
    warrantyCertificateId: "test-certificate",
  });
  expect(actor.getSnapshot().value).toBe("validated");
  expect(actor.getSnapshot().context.warrantyCertificateId).toBeNull();
  actor.stop();
});
