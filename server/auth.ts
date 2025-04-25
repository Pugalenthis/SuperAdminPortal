import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Express } from "express";
import session from "express-session";
import bcrypt from "bcrypt";
import { storage } from "./storage";
import { SuperAdmin, Admin } from "@shared/schema";

// Define a union type for user
type UserType = (SuperAdmin & { userType: 'superadmin' }) | (Admin & { userType: 'admin' });

declare global {
  namespace Express {
    interface User extends UserType {}
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
    secret: process.env.SESSION_SECRET || "business-card-platform-secret-key",
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
          // First try to find a super admin with this email
          const superAdmin = await storage.getSuperAdminByEmail(email);
          if (superAdmin && await comparePasswords(password, superAdmin.password)) {
            return done(null, {
              ...superAdmin,
              userType: 'superadmin'
            });
          }
          
          // If not found or password doesn't match, try admin
          const admin = await storage.getAdminByEmail(email);
          if (admin && await comparePasswords(password, admin.password)) {
            // Only allow active admins to log in
            if (admin.status !== 'active') {
              return done(null, false, { message: "Account is inactive" });
            }
            
            return done(null, {
              ...admin,
              userType: 'admin'
            });
          }
          
          // Neither worked, return false
          return done(null, false, { message: "Invalid email or password" });
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  // Serialize user to session
  passport.serializeUser((user: UserType, done) => {
    console.log(`Serializing ${user.userType}:`, user.id);
    // Store both the ID and user type in the session
    done(null, { id: user.id, userType: user.userType });
  });

  // Deserialize user from session
  passport.deserializeUser(async (serialized: { id: number, userType: string }, done) => {
    try {
      console.log(`Deserializing ${serialized.userType} id:`, serialized.id);
      
      if (serialized.userType === 'superadmin') {
        const superAdmin = await storage.getSuperAdmin(serialized.id);
        if (!superAdmin) {
          console.log("Super Admin not found during deserialization");
          return done(null, false);
        }
        console.log("User deserialized successfully:", superAdmin.email);
        done(null, {
          ...superAdmin,
          userType: 'superadmin'
        });
      } else if (serialized.userType === 'admin') {
        const admin = await storage.getAdmin(serialized.id);
        if (!admin) {
          console.log("Admin not found during deserialization");
          return done(null, false);
        }
        // Check if admin is still active
        if (admin.status !== 'active') {
          console.log("Admin account is inactive:", admin.email);
          return done(null, false);
        }
        console.log("User deserialized successfully:", admin.email);
        done(null, {
          ...admin,
          userType: 'admin'
        });
      } else {
        console.log("Unknown user type during deserialization");
        done(null, false);
      }
    } catch (error) {
      console.error("Error deserializing user:", error);
      done(error, null);
    }
  });

  // Standard login endpoint (works for both SuperAdmin and Admin)
  app.post("/api/login", (req, res, next) => {
    console.log("Login attempt for:", req.body.email);
    
    // Check if this is an HTML form submission (wants redirect) or API call (wants JSON)
    const wantsRedirect = req.headers['accept']?.includes('text/html') || 
                         req.query.redirect === 'true' ||
                         req.body.redirect === 'true';
    
    passport.authenticate("local", (err: Error, user: UserType | false, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Login failed - invalid credentials");
        if (wantsRedirect) {
          return res.redirect('/auth?error=invalid-credentials');
        }
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Session save error:", err);
          return next(err);
        }
        
        console.log("Login successful for:", user.email);
        console.log("Session ID:", req.sessionID);
        
        // Redirect based on user type if requested
        if (wantsRedirect) {
          const redirectUrl = user.userType === 'superadmin' ? '/' : '/admin/dashboard';
          console.log(`Performing server-side redirect to ${redirectUrl}`);
          return res.redirect(redirectUrl);
        }
        
        // Otherwise return JSON response
        if (user.userType === 'superadmin') {
          return res.status(200).json({ 
            id: user.id,
            email: user.email,
            userType: 'superadmin',
            redirectUrl: '/'
          });
        } else {
          return res.status(200).json({ 
            id: user.id,
            email: user.email,
            orgName: (user as Admin).orgName,
            userType: 'admin',
            redirectUrl: '/admin/dashboard'
          });
        }
      });
    })(req, res, next);
  });

  // Admin-specific login endpoint
  app.post("/api/admin/login", (req, res, next) => {
    console.log("Admin login attempt for:", req.body.email);
    
    passport.authenticate("local", (err: Error, user: UserType | false, info: any) => {
      if (err) {
        console.error("Login error:", err);
        return next(err);
      }
      
      if (!user) {
        console.log("Login failed - invalid credentials");
        return res.status(401).json({ message: info?.message || "Invalid credentials" });
      }
      
      // Check if this is an admin account
      if (user.userType !== 'admin') {
        console.log("Login failed - not an admin account");
        return res.status(403).json({ message: "This login is only for organization admins" });
      }
      
      req.login(user, (err) => {
        if (err) {
          console.error("Session save error:", err);
          return next(err);
        }
        
        console.log("Admin login successful for:", user.email);
        
        return res.status(200).json({ 
          id: user.id,
          email: user.email,
          orgName: (user as Admin).orgName
        });
      });
    })(req, res, next);
  });

  // Get current user info
  app.get("/api/user", (req, res) => {
    console.log("Session check - authenticated:", req.isAuthenticated());
    console.log("Session ID:", req.sessionID);
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    
    const user = req.user as UserType;
    console.log("Current user:", user.email, `(${user.userType})`);
    
    // Return different data based on user type
    if (user.userType === 'superadmin') {
      return res.json({
        id: user.id,
        email: user.email,
        userType: 'superadmin'
      });
    } else {
      return res.json({
        id: user.id,
        email: user.email,
        orgName: (user as Admin).orgName,
        userType: 'admin'
      });
    }
  });

  // Logout
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
