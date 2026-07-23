// Small dependency-free constants shared between edge middleware and
// Node.js server code (avoids pulling jsonwebtoken/bcrypt into the edge runtime).
export const AUTH_COOKIE_NAME = "mm_drugs_token";
