import crypto from "crypto";
import { reserve, cancel, confirm } from "../services/holds.service.js";

export async function reserveHold(req, res) {
  try {
    const result = await reserve(req.body);
    res.status(200).json(result);
  } catch (e) {
    if (e.code === "SOLD_OUT")
      return res.status(409).json({ message: "sold out" });
    if (e.code === "BAD_REQUEST")
      return res.status(400).json({ message: e.message });
    console.error("[api] reserve error:", e);
    res.status(500).json({ message: "internal error" });
  }
}

export async function confirmHold(req, res) {
  try {
    const result = await confirm(req.body);
    res.status(200).json(result);
  } catch (e) {
    if (e.code === "EXPIRED")
      return res.status(410).json({ message: "hold expired" });
    if (e.code === "BAD_REQUEST")
      return res.status(400).json({ message: e.message });
    console.error("[api] confirm error:", e);
    res.status(500).json({ message: "internal error" });
  }
}
export async function cancelHold(params) {
  try {
    const result = await cancel(req.body);
    return res.status(200).json(result);
  } catch (e) {
    if (e.code === "BAD_REQUEST")
      return res.status(400).json({ message: e.message });
    console.error("[api] cancel error:", e);
    res.status(500).json({ message: "internal error" });
  }
}
