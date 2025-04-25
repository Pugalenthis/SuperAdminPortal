import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { setupAuth } from "./auth";
import { insertAdminSchema } from "@shared/schema";
import bcrypt from "bcrypt";
import { z } from "zod";

export async function registerRoutes(app: Express): Promise<Server> {
  // Setup authentication
  setupAuth(app);

  // Get all admins
  app.get("/api/admins", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const admins = await storage.getAllAdmins();
      // Remove sensitive information
      const safeAdmins = admins.map(admin => ({
        id: admin.id,
        orgName: admin.orgName,
        email: admin.email,
        status: admin.status,
        createdAt: admin.createdAt
      }));
      res.json(safeAdmins);
    } catch (error) {
      res.status(500).json({ message: "Failed to fetch admins" });
    }
  });

  // Create a new admin
  app.post("/api/admins", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      // Validate request body
      const validatedData = insertAdminSchema.parse(req.body);

      // Check if admin with this email already exists
      const existingAdmin = await storage.getAdminByEmail(validatedData.email);
      if (existingAdmin) {
        return res.status(400).json({ message: "An admin with this email already exists" });
      }

      // Hash the password
      const hashedPassword = await bcrypt.hash(validatedData.password, 10);

      // Create new admin
      const newAdmin = await storage.createAdmin({
        ...validatedData,
        password: hashedPassword
      });

      // Return the new admin without password
      res.status(201).json({
        id: newAdmin.id,
        orgName: newAdmin.orgName,
        email: newAdmin.email,
        status: newAdmin.status,
        createdAt: newAdmin.createdAt
      });
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ 
          message: "Validation error", 
          errors: error.errors 
        });
      }
      res.status(500).json({ message: "Failed to create admin" });
    }
  });

  // Delete an admin
  app.delete("/api/admins/:id", async (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Unauthorized" });
    }

    try {
      const id = parseInt(req.params.id);
      if (isNaN(id)) {
        return res.status(400).json({ message: "Invalid admin ID" });
      }

      // Check if admin exists
      const admin = await storage.getAdmin(id);
      if (!admin) {
        return res.status(404).json({ message: "Admin not found" });
      }

      // Delete the admin
      const success = await storage.deleteAdmin(id);
      if (success) {
        res.status(200).json({ message: "Admin deleted successfully" });
      } else {
        res.status(500).json({ message: "Failed to delete admin" });
      }
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
