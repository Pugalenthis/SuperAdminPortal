import express from "express";
import session from "express-session";
import cors from "cors";
import fileUpload from "express-fileupload";
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import dotenv from 'dotenv';
import { setupAuth } from "./auth.js";
import connectDB from "./db.js";
import { registerRoutes } from "./routes.js";
import { storage } from "./storage.js";
import http from "http";

// Load environment variables
dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Helper function for logging
function log(message, source = "express") {
  const formattedTime = new Date().toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });

  console.log(`${formattedTime} [${source}] ${message}`);
}

// Initialize Express app
const app = express();
const server = http.createServer(app);

// Connect to MongoDB
connectDB();

// Middleware
app.use(cors({
  origin: process.env.NODE_ENV === 'production' ? false : ['http://localhost:3000', 'http://localhost:5000'],
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// File upload middleware
app.use(fileUpload({
  createParentPath: true,
  limits: { 
    fileSize: 5 * 1024 * 1024 // 5MB
  },
  abortOnLimit: true
}));

// Create uploads directory if it doesn't exist
const uploadsDir = path.join(__dirname, '..', 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Serve static files from uploads directory
app.use('/uploads', express.static(uploadsDir));

// Session middleware
app.use(session({
  secret: process.env.SESSION_SECRET || 'your-secret-key',
  resave: false,
  saveUninitialized: false,
  store: storage.sessionStore,
  cookie: {
    secure: process.env.NODE_ENV === 'production',
    maxAge: 1000 * 60 * 60 * 24 * 7 // 1 week
  }
}));

// Setup authentication
setupAuth(app);

// Register API routes
registerRoutes(app);

// Error handler middleware
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'An error occurred on the server',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Serve static files for the client (React app)
const clientBuildPath = path.join(__dirname, '..', 'client', 'build');
// Check if the client build directory exists
if (fs.existsSync(clientBuildPath)) {
  log('Serving static files from ' + clientBuildPath);
  app.use(express.static(clientBuildPath));
  
  // Catch-all route to serve React app
  app.get('*', (req, res) => {
    res.sendFile(path.join(clientBuildPath, 'index.html'));
  });
}

// Start the server
const PORT = process.env.PORT || 5000;
server.listen({
  port: PORT,
  host: "0.0.0.0",
}, () => {
  log(`Server running on port ${PORT}`);
});

export default app;