import { decrypt } from "./utils/crypto";

// Paste the iv:ciphertext string from Postman here
const responseCiphertext = "f022e4ee3358658a92b76cfe2e8c530e:88b3c4a072bc327b5b908ce630d9e41c97187b33cd1c1b5ce11df3e9acf73fe1fbd985ca17a9c56afcc926bc0176b8716b4f623201f8292b9ca5c8a85b6fb98974b422de383cd2f686a7e76249701f56";

console.log("DECRYPTED_TOKEN:", decrypt(responseCiphertext));