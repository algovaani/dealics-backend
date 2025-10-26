import { Router } from "express";
import {
  sendEmail,
  sendWelcomeOnboardingEmail,
  sendEmailVerification,
  sendUnifiedEmail,
  getEmailTemplate,
  createOrUpdateEmailTemplate,
  getAllEmailTemplates,
  deleteEmailTemplate,
  processMailQueue,
  getMailQueueStatus,
  testEmailConfig,
  updateMailSettings
} from "../controllers/email.controller.js";

const router = Router();


// Email sending endpoints
router.post("/send", sendEmail);
router.post("/welcome-onboarding", sendWelcomeOnboardingEmail);
router.post("/send-verification", sendEmailVerification);
router.post("/send-unified", sendUnifiedEmail);

// Email template management
router.get("/template/:alias", getEmailTemplate);
router.post("/template", createOrUpdateEmailTemplate);
router.get("/templates", getAllEmailTemplates);
router.delete("/template/:id", deleteEmailTemplate);

// Mail queue management
router.post("/process-queue", processMailQueue);
router.get("/queue-status", getMailQueueStatus);

// Email configuration and settings
router.post("/test-config", testEmailConfig);
router.put("/settings", updateMailSettings);


export default router;
