import { handleHoldCreated } from "./holdCreated.handler.js";
import { handleHoldConfirm } from "./holdConfirmed.handler.js";
import { handleHoldCancelled } from "./holdCancelled.handler.js";
import { handleHoldExpired } from "./holdExpired.handler.js";
import { EVENT_TYPES } from "../../../../shared/common/src/index.js";

export async function dispatch(type, data) {
  switch (type) {
    case EVENT_TYPES.HOLD_CREATED:
      return handleHoldCreated(data);
    case EVENT_TYPES.HOLD_CONFIRMED:
      return handleHoldConfirm(data);
    case EVENT_TYPES.HOLD_CANCELLED:
      return handleHoldCancelled(data);
    case EVENT_TYPES.HOLD_EXPIRED:
      return handleHoldExpired(data);
    default:
      console.log("[worker] unknown event type:", type);
      return;
  }
}
