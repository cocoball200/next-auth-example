import NextAuth from "next-auth";
import CredentialProvider from "next-auth/providers/credentials";
import moment from "moment";

async function refreshAccessToken(token) {
  try {
    const response = await (
      await fetch(`${process.env.NEXTAUTH_URL}/getRefreshToken`, {
        method: "POST",
        headers: {
          cookie: `refresh-token=${token.refreshToken}`,
        },
      })
    ).json();

    const {
      data: { accessToken, accessTokenExpireDate, userInformation },
    } = response;

    if (data.accessToken) {
      return { accessToken, accessTokenExpireDate, userInformation };
    }
  } catch (error) {
    return {
      accessToken: null,
      accessTokenExpireDate: null,
      userInformation: null,
      error: "can not get accessToken",
    };
  }
}
const callbacks = {
  async jwt({ token, user }) {
    if (user) {
      token.accessToken = user.accessToken;
      token.refreshToken = user.refreshToken;
      token.accessTokenExpireDate = user.accessTokenExpireDate;
      token.refreshTokenExpireDate = user.refreshTokenExpireDate;
      token.userInformation = user.userInformation;
    } else {
      const now = new Date();
      const remainingTimeAccessTokenExpireDate = moment(
        token.accessTokenExpireDate
      ).diff(now, "h");
      if (remainingTimeAccessTokenExpireDate > 0) {
        return Promise.resolve(token);
      }
      const refreshedToken = await refreshAccessToken(token);
      token.accessToken = refreshedToken.accessToken;
      token.accessTokenExpireDate = refreshedToken.accessTokenExpireDate;
      token.userInformation = refreshedToken.userInformation;
    }
    return Promise.resolve(token);
  },
  async session({ session, token }) {
    session.userInformation = token.userInformation;
    return session;
  },
};

const options = {
  callbacks,
  pages: {
    signIn: "/signIn",
  },
  secret: process.env.NEXTAUTH_URL,
  logger: {
    error(code, metadata) {
      log.error(code, metadata);
    },
    warn(code) {
      log.warn(code);
    },
    debug(code, metadata) {
      log.debug(code, metadata);
    },
  },
};
const nextAuthOptions = (req, res) => {
  return {
    providers: [
      CredentialProvider({
        name: "credentials",
        credentials: {
          username: { label: "Username", type: "username" },
          password: { label: "Password", type: "password" },
        },

        async authorize(credential) {
          try {
            const response = await (
              await fetch(`${process.env.NEXTAUTH_URL}/siginIn`, {
                method: "POST",
                body: JSON.stringify({
                  email: credential?.username,
                  password: credential?.password,
                }),
              })
            ).json();

            const {
              data: {
                userInformation,
                refreshToken,
                accessToken,
                refreshTokenExpireDate,
                accessTokenExpireDate,
              },
              status,
            } = response;
            if (status === 200 && data) {
              return {
                userInformation,
                refreshToken,
                accessToken,
                refreshTokenExpireDate,
                accessTokenExpireDate,
              };
            }
          } catch (error) {
            console.log(error);
            throw new Error(error);
          }
        },
      }),
    ],
    ...options,
  };
};

export default (req, res) => {
  return NextAuth(req, res, nextAuthOptions(req, res));
};
