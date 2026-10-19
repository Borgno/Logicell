import { createRouter } from "../../lib/router";
import {
  createStatusHandler,
  deleteStatusHandler,
  listStatusHandler,
  reorderStatusHandler,
  updateStatusHandler,
} from "./status.handlers";
import {
  createStatusRoute,
  deleteStatusRoute,
  listStatusRoute,
  reorderStatusRoute,
  updateStatusRoute,
} from "./status.routes";

const status = createRouter();
status.openapi(listStatusRoute, listStatusHandler);
status.openapi(createStatusRoute, createStatusHandler);
// Antes do /{id}: "ordem" não é id.
status.openapi(reorderStatusRoute, reorderStatusHandler);
status.openapi(updateStatusRoute, updateStatusHandler);
status.openapi(deleteStatusRoute, deleteStatusHandler);

export default status;
