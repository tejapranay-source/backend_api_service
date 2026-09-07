import { encrypt } from "./utils/crypto";

const taskData = {
  title: "Complete E2EE Task Management API",
  description: "Test creating an encrypted task via the POST /api/tasks endpoint."
};

console.log("TASK_ENCRYPTED_OUTPUT:", encrypt(JSON.stringify(taskData)));