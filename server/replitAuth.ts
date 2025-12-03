import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import session from "express-session";
import type { Express, RequestHandler } from "express";
import connectPg from "connect-pg-simple";
import { storage } from "./storage";
import bcryptjs from "bcryptjs";

export function getSession() {
  const sessionTtl = 7 * 24 * 60 * 60 * 1000; // 1 week
  const pgStore = connectPg(session);
  const sessionStore = new pgStore({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: false,
    ttl: sessionTtl,
    tableName: "sessions",
  });
  return session({
    secret: process.env.SESSION_SECRET!,
    store: sessionStore,
    resave: false,
    saveUninitialized: false,
    cookie: {
      httpOnly: true,
      secure: true,
      maxAge: sessionTtl,
      sameSite: "lax",
    },
  });
}

export async function setupAuth(app: Express) {
  app.set("trust proxy", 1);
  app.use(getSession());
  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(
      {
        usernameField: "username",
        passwordField: "password",
      },
      async (username, password, done) => {
        try {
          const user = await storage.getUserByUsername(username);
          if (!user) {
            return done(null, false, { message: "Invalid credentials" });
          }

          const isPasswordValid = await bcryptjs.compare(password, user.password);
          if (!isPasswordValid) {
            return done(null, false, { message: "Invalid credentials" });
          }

          return done(null, { id: user.id, username: user.username });
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: any, cb) => {
    cb(null, user.id);
  });

  passport.deserializeUser(async (id: string | undefined, cb) => {
    console.debug("deserializeUser called with id:", id);

    if (!id) {
      console.debug("deserializeUser: no id in session");
      // No id in session — not authenticated
      return cb(null, false);
    }

    try {
      const user = await storage.getUser(id);

      if (!user) {
        console.debug("deserializeUser: user not found for id", id);
        // User not found in DB (maybe deleted) — clear session
        return cb(null, false);
      }

      console.debug("deserializeUser: found user", user.id);
      cb(null, user);
    } catch (error) {
      // Log error but don't crash the app — treat as unauthenticated
      // Passport will surface errors when appropriate; avoid throwing here
      console.error("Error deserializing user:", error);
      return cb(null, false);
    }
  });
}

export const isAuthenticated: RequestHandler = (req, res, next) => {
  if (req.isAuthenticated()) {
    return next();
  }
  res.status(401).json({ message: "Unauthorized" });
};
