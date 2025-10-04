import NextAuth, { type NextAuthOptions } from "next-auth"
import CredentialsProvider from "next-auth/providers/credentials"
import { getUserByEmail, createUser } from "@/lib/db/users"

const DEFAULT_SETTINGS = {
  pomodoroTime: 25,
  shortBreakTime: 5,
  longBreakTime: 15,
  longBreakInterval: 4,
  autoStartBreaks: false,
  autoStartPomodoros: false,
  theme: "light" as const,
  pomodoroColor: "#f97316",
  shortBreakColor: "#06b6d4",
  longBreakColor: "#8b5cf6",
  alarmSound: "bell",
  backgroundSound: "none",
  alarmVolume: 50,
  backgroundVolume: 30,
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Email",
      credentials: {
        email: { label: "Email", type: "email", placeholder: "your@email.com" },
      },
      async authorize(credentials) {
        if (!credentials?.email) return null

        let user = await getUserByEmail(credentials.email)

        if (!user) {
          user = await createUser({
            email: credentials.email,
            name: credentials.email.split("@")[0],
            settings: DEFAULT_SETTINGS,
          })
        }

        return {
          id: user._id!.toString(),
          email: user.email,
          name: user.name,
        }
      },
    }),
  ],
  callbacks: {
    async signIn({ user }) {
      if (!user.email) return false

      const existingUser = await getUserByEmail(user.email)

      if (!existingUser) {
        await createUser({
          email: user.email,
          name: user.name || "",
          image: user.image,
          settings: DEFAULT_SETTINGS,
        })
      }

      return true
    },
    async session({ session }) {
      if (session.user?.email) {
        const dbUser = await getUserByEmail(session.user.email)
        if (dbUser) {
          session.user.id = dbUser._id!.toString()
        }
      }
      return session
    },
  },
  pages: {
    signIn: "/",
  },
  secret: process.env.NEXTAUTH_SECRET,
}

const handler = NextAuth(authOptions)
export { handler as GET, handler as POST }
