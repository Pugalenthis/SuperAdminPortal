import passport from 'passport';
import { Strategy as LocalStrategy } from 'passport-local';
import bcrypt from 'bcrypt';
import { storage } from './storage.js';

// Function to hash a password
async function hashPassword(password) {
  return await bcrypt.hash(password, 10);
}

// Function to compare passwords
async function comparePasswords(supplied, stored) {
  return await bcrypt.compare(supplied, stored);
}

export function setupAuth(app) {
  // Configure passport local strategy
  passport.use(new LocalStrategy(
    { usernameField: 'email' },
    async (email, password, done) => {
      try {
        // First check if this is a super admin
        const superAdmin = await storage.getSuperAdminByEmail(email);
        if (superAdmin) {
          const isValid = await comparePasswords(password, superAdmin.password);
          if (isValid) {
            return done(null, { ...superAdmin.toObject(), userType: 'superadmin' });
          }
        }

        // Then check if this is a regular admin
        const admin = await storage.getAdminByEmail(email);
        if (admin) {
          const isValid = await comparePasswords(password, admin.password);
          if (isValid) {
            return done(null, { ...admin.toObject(), userType: 'admin' });
          }
        }
        
        // No valid user found
        return done(null, false, { message: 'Invalid email or password' });
      } catch (error) {
        return done(error);
      }
    }
  ));

  // Serialize user to session
  passport.serializeUser((user, done) => {
    console.log(`Serializing ${user.userType} id: ${user._id}`);
    done(null, { id: user._id, userType: user.userType });
  });

  // Deserialize user from session
  passport.deserializeUser(async (serializedUser, done) => {
    try {
      if (serializedUser.userType === 'superadmin') {
        console.log(`Deserializing super admin id: ${serializedUser.id}`);
        const superAdmin = await storage.getSuperAdmin(serializedUser.id);
        if (superAdmin) {
          console.log('User deserialized successfully:', superAdmin.email);
          return done(null, { ...superAdmin.toObject(), userType: 'superadmin' });
        }
      } else if (serializedUser.userType === 'admin') {
        console.log(`Deserializing admin id: ${serializedUser.id}`);
        const admin = await storage.getAdmin(serializedUser.id);
        if (admin) {
          console.log('User deserialized successfully:', admin.email);
          return done(null, { ...admin.toObject(), userType: 'admin' });
        }
      }
      done(new Error('User not found'));
    } catch (error) {
      done(error);
    }
  });

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Login endpoint
  app.post('/api/login', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || 'Authentication failed' });
      
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(200).json({
          id: user._id,
          email: user.email,
          orgName: user.orgName,
          userType: user.userType
        });
      });
    })(req, res, next);
  });

  // Super admin login endpoint
  app.post('/api/login/super', (req, res, next) => {
    passport.authenticate('local', (err, user, info) => {
      if (err) return next(err);
      if (!user) return res.status(401).json({ message: info?.message || 'Authentication failed' });
      if (user.userType !== 'superadmin') return res.status(403).json({ message: 'Not authorized' });
      
      req.login(user, (err) => {
        if (err) return next(err);
        return res.status(200).json({
          id: user._id,
          email: user.email,
          userType: user.userType
        });
      });
    })(req, res, next);
  });

  // Logout endpoint
  app.post('/api/logout', (req, res) => {
    req.logout(function(err) {
      if (err) return res.status(500).json({ message: 'Error during logout', error: err.message });
      req.session.destroy(function (err) {
        if (err) return res.status(500).json({ message: 'Error destroying session', error: err.message });
        res.clearCookie('connect.sid');
        return res.status(200).json({ message: 'Logged out successfully' });
      });
    });
  });

  // Get current user endpoint
  app.get('/api/user', (req, res) => {
    // Check if session exists and is authenticated
    console.log('Session check - authenticated:', req.isAuthenticated());
    if (req.session) {
      console.log('Session ID:', req.session.id);
    }
    
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: 'Not authenticated' });
    }
    
    console.log('Current user:', req.user.email, `(${req.user.userType})`);
    return res.status(200).json({
      id: req.user._id,
      email: req.user.email,
      orgName: req.user.orgName,
      userType: req.user.userType
    });
  });
}