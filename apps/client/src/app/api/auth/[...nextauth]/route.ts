// /api/auth/[nextauth]
import axios from "axios";
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";

const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: "896328445587-2nmm5ihs57k2a8s3j37f3r29p1jsgamq.apps.googleusercontent.com",
      clientSecret: "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",
    }),
  ],
  secret: "123",

  session: {
    strategy: "jwt",
  },

 pages: {
  signIn: "/auth", // 👈 this fixes it
  error: "/auth",  // 👈 this handles errors (like cancel, popup closed)
},


  callbacks: {
    async jwt({ token }) {
        return token; // ✅ keep it clean
    } ,
    async session({ session, token }) {
        return session;
    }
  }
});

export { handler as GET, handler as POST };