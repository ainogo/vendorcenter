import { Router } from "express";
import { z } from "zod";
import { requireRole } from "../../middleware/auth.js";
import { AuthRequest } from "../../middleware/auth.js";
import { listEmployeeZones, replaceEmployeeZones } from "./employee.repository.js";
import {
  createSupportTask,
  listAllSupportTasks,
  listSupportTasksByAssignee,
  updateSupportTaskStatus
} from "./support-tasks.repository.js";
import { trackActivity } from "../activity/activity.service.js";

export const employeeRouter = Router();

employeeRouter.post("/assign-zones", requireRole(["admin"]), async (req, res) => {
  const parsed = z.object({ employeeId: z.string().min(3), zones: z.array(z.string()).min(1) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  await replaceEmployeeZones(parsed.data.employeeId, parsed.data.zones);
  res.status(201).json({ success: true, data: parsed.data });
});

employeeRouter.get("/my-zones", requireRole(["employee"]), async (req: AuthRequest, res) => {
  res.json({ success: true, data: await listEmployeeZones(req.actor!.id) });
});

employeeRouter.post("/support-tasks", requireRole(["admin", "employee"]), async (req: AuthRequest, res) => {
  const parsed = z
    .object({
      title: z.string().min(2),
      description: z.string().optional(),
      zone: z.string().optional(),
      assignedTo: z.string().min(2),
      priority: z.enum(["low", "medium", "high", "critical"]).default("medium")
    })
    .safeParse(req.body);

  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const task = await createSupportTask({
    ...parsed.data,
    assignedBy: req.actor!.id
  });

  trackActivity({
    actorId: req.actor!.id,
    role: req.actor!.role,
    action: "employee.support_task_created",
    entity: "support_task",
    requestId: (req as unknown as { requestId?: string }).requestId,
    metadata: { taskId: task.id, assignedTo: task.assignedTo }
  });

  res.status(201).json({ success: true, data: task });
});

employeeRouter.get("/support-tasks", requireRole(["admin", "employee"]), async (req: AuthRequest, res) => {
  if (req.actor!.role === "employee") {
    res.json({ success: true, data: await listSupportTasksByAssignee(req.actor!.id) });
    return;
  }

  res.json({ success: true, data: await listAllSupportTasks() });
});

employeeRouter.patch("/support-tasks/:taskId/status", requireRole(["admin", "employee"]), async (req: AuthRequest, res) => {
  const parsed = z.object({ status: z.enum(["open", "in_progress", "resolved", "closed"]) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ success: false, error: parsed.error.flatten() });
    return;
  }

  const task = await updateSupportTaskStatus(req.params.taskId, parsed.data.status);
  if (!task) {
    res.status(404).json({ success: false, error: "Support task not found" });
    return;
  }

  trackActivity({
    actorId: req.actor!.id,
    role: req.actor!.role,
    action: "employee.support_task_status_updated",
    entity: "support_task",
    requestId: (req as unknown as { requestId?: string }).requestId,
    metadata: { taskId: req.params.taskId, status: parsed.data.status }
  });

  res.json({ success: true, data: task });
});
