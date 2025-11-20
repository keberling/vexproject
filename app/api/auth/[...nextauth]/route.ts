import NextAuth, { NextAuthOptions } from 'next-auth'
import AzureADProvider from 'next-auth/providers/azure-ad'
import { prisma } from '@/lib/prisma'
import { generateToken } from '@/lib/auth'

export const authOptions: NextAuthOptions = {
  providers: [
    AzureADProvider({
      clientId: process.env.AZURE_AD_CLIENT_ID!,
      clientSecret: process.env.AZURE_AD_CLIENT_SECRET!,
      tenantId: process.env.AZURE_AD_TENANT_ID,
      authorization: {
        params: {
          scope: 'openid profile email User.Read Files.ReadWrite.All Sites.ReadWrite.All offline_access',
        },
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account, profile }) {
      if (account?.provider === 'azure-ad') {
        try {
          // Check if user exists
          const existingUser = await prisma.user.findUnique({
            where: { email: user.email! },
          })

          if (existingUser) {
            // Update existing user with Microsoft info
            await prisma.user.update({
              where: { id: existingUser.id },
              data: {
                provider: 'microsoft',
                microsoftId: account.providerAccountId,
                accessToken: account.access_token,
                refreshToken: account.refresh_token,
                name: user.name || existingUser.name,
              },
            })
          } else {
            // Create new user
            await prisma.user.create({
              data: {
                email: user.email!,
                name: user.name,
                provider: 'microsoft',
                microsoftId: account.providerAccountId,
                accessToken: account.access_token,
                refreshToken: account.refresh_token,
              },
            })
          }
        } catch (error) {
          console.error('Error in signIn callback:', error)
          return false
        }
      }
      return true
    },
    async jwt({ token, account, user }) {
      // Initial sign in
      if (account && user) {
        // Get user ID from database
        const dbUser = await prisma.user.findUnique({
          where: { email: user.email! },
          select: { id: true },
        })
        
        return {
          ...token,
          accessToken: account.access_token,
          refreshToken: account.refresh_token,
          accessTokenExpires: account.expires_at ? account.expires_at * 1000 : null,
          userId: dbUser?.id,
        }
      }

      // Return previous token if the access token has not expired yet
      if (token.accessTokenExpires && Date.now() < token.accessTokenExpires) {
        return token
      }

      // Access token has expired, try to update it
      return await refreshAccessToken(token)
    },
    async session({ session, token }) {
      if (token) {
        session.user = {
          ...session.user,
          id: token.userId as string,
        }
        session.accessToken = token.accessToken as string
        session.error = token.error as string | undefined
      }
      return session
    },
  },
  pages: {
    signIn: '/',
  },
  session: {
    strategy: 'jwt',
  },
}

async function refreshAccessToken(token: any) {
  try {
    const url = `https://login.microsoftonline.com/${process.env.AZURE_AD_TENANT_ID}/oauth2/v2.0/token`
    
    const response = await fetch(url, {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.AZURE_AD_CLIENT_ID!,
        client_secret: process.env.AZURE_AD_CLIENT_SECRET!,
        grant_type: 'refresh_token',
        refresh_token: token.refreshToken,
        scope: 'openid profile email User.Read Files.ReadWrite.All Sites.ReadWrite.All offline_access',
      }),
      method: 'POST',
    })

    const refreshedTokens = await response.json()

    if (!response.ok) {
      throw refreshedTokens
    }

    return {
      ...token,
      accessToken: refreshedTokens.access_token,
      accessTokenExpires: Date.now() + refreshedTokens.expires_in * 1000,
      refreshToken: refreshedTokens.refresh_token ?? token.refreshToken,
    }
  } catch (error) {
    console.error('Error refreshing access token', error)

    return {
      ...token,
      error: 'RefreshAccessTokenError',
    }
  }
}

const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }

