import { decrypt } from "./utils/crypto";

// Paste the iv:ciphertext response string from Postman here
const responseCiphertext = "PASTE_POSTMAN_RESPONSE_DATA_HERE";

console.log("DECRYPTED_TASK_RESPONSE:", decrypt(responseCiphertext));