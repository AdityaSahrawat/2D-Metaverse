// types/next-auth.d.ts
import NextAuth from "next-auth";

declare module "next-auth" {
  interface Session {
    backendToken?: string;
  }

  interface User {
    token?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    backendToken?: string;
  }
}