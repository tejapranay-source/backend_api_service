import { encrypt } from "./utils/crypto";

const registerData = { 
  name: "Test User", 
  email: "test@example.com", 
  password: "securepassword123" 
};

console.log("ENCRYPTED_OUTPUT:", encrypt(JSON.stringify(registerData)));