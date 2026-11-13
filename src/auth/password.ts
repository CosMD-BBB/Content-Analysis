import bcrypt from "bcryptjs";

const COST = Number(process.env.BCRYPT_COST ?? 12);

export const MIN_PASSWORD = 8;
export const hashPassword = (pw: string) => bcrypt.hash(pw, COST);
export const verifyPassword = (pw: string, hash: string) => bcrypt.compare(pw, hash);
