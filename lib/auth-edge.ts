import NextAuth, { type DefaultSession } from 'next-auth';
import Credentials from 'next-auth/providers/credentials';
import type { JWT } from 'next-auth/jwt';

// Extend the built-in session types (must match auth.ts)
declare module 'next-auth' {
  interface Session extends DefaultSession {
    user: {
      id: string;
      role: string;
    } & DefaultSession['user'];
  }

  interface User {
    role: string;
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    role: string;
    id: string;
  }
}

// Lightweight auth configuration for middleware (no database adapter)
const edgeConfig = {
  providers: [
    Credentials({
      id: 'credentials',
      name: 'Credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' }
      },
      authorize: async () => {
        // Middleware never calls authorize - it only validates JWTs
        // This is a placeholder that satisfies the provider requirements
        return null;
      }
    })
  ],
  session: {
    strategy: 'jwt' as const
  },
  callbacks: {
    jwt({ token, user }: { token: JWT; user: any }): JWT {
      if (user) {
        token.role = user.role;
        token.id = user.id;
      }
      return token;
    },
    session({ session, token }: { session: any; token: JWT }): any {
      if (token && session.user) {
        session.user.role = token.role;
        session.user.id = token.id;
      }
      return session;
    }
  }
};

export const { auth: authEdge } = NextAuth(edgeConfig);
