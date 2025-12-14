// src/utils/constants.ts
export const rpName = 'Passkey Tutorial';
export const rpID = process.env.RP_ID || 'localhost';
export const origin = [`http://${rpID}:8080`, `http://127.0.0.1:8080`];