import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { SuperAdmin } from "@shared/schema";

declare global {
  namespace Express {
    interface User extends SuperAdmin {}
  }
}

// Function to hash passwords
async function hashPassword(password: string): Promise<string> {
  const saltRounds = 10;
  return bcrypt.hash(password, saltRounds);
}

// Function to compare passwords
async function comparePasswords(supplied: string, stored: string): Promise<boolean> {
  return bcrypt.compare(supplied, stored);
}

export function setupAuth(app: Express) {
  // Session configuration
  const sessionSettings: session.SessionOptions = {
    secret: process.env.SESSION_SECRET || "super-admin-secret-key",
    resave: false,
    saveUninitialized: false,
    store: storage.sessionStore,
    cookie: {
      maxAge: 24 * 60 * 60 * 1000, // 24 hours
      secure: false, // Set to false to allow cookies in development
      httpOnly: true,
      sameSite: "lax"
    }
  };

  app.use(session(sessionSettings));
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const superAdmin = await storage.getSuperAdminByEmail(email);
          if (!superAdmin || !(await comparePasswords(password, superAdmin.password))) {
            return done(null, false, { message: "Invalid email or password" });
          }
          return done(null, superAdmin);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize and deserialize user
  passport.serializeUser((user, done) => {
    console.log("Serializing user:", user.id);
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      console.log("Deserializing user id:", id);
      const superAdmin = await storage.getSuperAdmin(id);
      if (!superAdmin) {
        console.log("User not found during deserialization");
        return done(null, false);
      }
      console.log("User deserialized successfully:", superAdmin.email);
      done(null, superAdmin);
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error, null);
    }
  });

  // Auth routes
  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt for:", req.body.email);
    
    passport.authenticate("local", (err: Error, user: SuperAdmin, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Login failed - invalid credentials");
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Session save error:", err);
          return next(err);
        }
        
        console.log("Login successful for:", user.email);
        console.log("Session ID:", req.sessionID);
        
        return res.status(200).json({ 
          id: user.id,
          email: user.email 
        });
      });
    })(req, res, next);
  });

  app.get("/api/user", (req, res) => {
    console.log("Session check - authenticated:", req.isAuthenticated());
    console.log("Session ID:", req.sessionID);
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user as SuperAdmin;
    console.log("Current user:", user.email);
    
    res.json({
      id: user.id,
      email: user.email
    });
  });

  app.post("/api/logout", (req, res, next) => {
    console.log("Logout attempt for user:", req.user?.email);
    
    req.logout((err) => {
      if (err) {
        console.error("Logout error:", err);
        return next(err);
      }
      
      console.log("Logout successful");
      res.status(200).json({ message: "Logged out successfully" });
    });
  });
}
