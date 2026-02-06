import { Router } from "express";
import {
  reserveHold,
  confirmHold,
  cancelHold,
} from "../controllers/holds.contoller";

export const holdsRouter = Router();
holdsRouter.post("/reserve", reserveHold);
holdsRouter.post("/confirm", confirmHold);
holdsRouter.post("/cancel", cancelHold);
