// /api/auth/[nextauth]
import NextAuth from "next-auth";
import GoogleProvider from "next-auth/providers/google";
const client_id = process.env.NEXT_PUBLIC_CLIENTID
const client_secret = process.env.NEXT_PUBLIC_CLIENT_SECRET
const handler = NextAuth({
  providers: [
    GoogleProvider({
      clientId: client_id!,
      clientSecret: client_secret!,
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