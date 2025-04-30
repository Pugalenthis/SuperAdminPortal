import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current directory
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Path to the workflows directory
const workflowsDir = path.join(__dirname, '..', '.replit', 'workflows');

// Create workflows directory if it doesn't exist
try {
  fs.mkdirSync(workflowsDir, { recursive: true });
} catch (err) {
  // Directory already exists
}

// Create MongoDB workflow file
const mongoWorkflowPath = path.join(workflowsDir, 'mongodb-app.json');
const mongoWorkflowData = {
  name: 'Start MongoDB application',
  description: 'Runs the application with MongoDB database',
  command: 'npm run dev:mongo',
  hidden: false,
  icon: 'database',
  workspace: 'parent'
};

// Write the workflow file
fs.writeFileSync(mongoWorkflowPath, JSON.stringify(mongoWorkflowData, null, 2));

console.log('✅ MongoDB workflow has been added');