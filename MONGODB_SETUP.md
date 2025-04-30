# Setting Up MongoDB for Your Application

This guide will help you set up a MongoDB database for use with your application. The application now supports both PostgreSQL (original) and MongoDB databases.

## Option 1: Use MongoDB Atlas (Recommended for Production)

MongoDB Atlas is a fully-managed cloud database service that provides a free tier for small applications.

1. Create a free account at [MongoDB Atlas](https://www.mongodb.com/cloud/atlas/register)
2. Create a new cluster (free tier is sufficient for testing)
3. Set up a database user with a username and password
4. Configure network access (whitelist your IP address or allow access from anywhere for development)
5. Get your connection string from the "Connect" button in the Atlas dashboard
6. Update your `.env` file with the MongoDB connection string:

```
MONGODB_URI=mongodb+srv://username:password@clustername.mongodb.net/businesscards?retryWrites=true&w=majority
```

## Option 2: Use a Local MongoDB Instance (For Development)

1. Install MongoDB Community Edition on your local machine following the [official documentation](https://docs.mongodb.com/manual/installation/)
2. Start the MongoDB server:
   ```
   mongod --dbpath /path/to/data/directory
   ```
3. Update your `.env` file with the local connection string:
   ```
   MONGODB_URI=mongodb://localhost:27017/businesscards
   ```

## Migrating Data from PostgreSQL to MongoDB

If you have existing data in PostgreSQL that you want to migrate to MongoDB:

1. Ensure both your PostgreSQL and MongoDB databases are properly configured in your `.env` file
2. Run the migration script:
   ```
   npm run migrate:mongo
   ```

## Using the MongoDB Version of the Application

After setting up your MongoDB database, you can run the application with MongoDB:

```bash
# Development mode
npm run dev:mongo

# Build for production
npm run build:mongo

# Run in production mode
npm run start:mongo
```

## Switching Between PostgreSQL and MongoDB

You can easily switch between the two database systems by using the appropriate npm scripts:

- For PostgreSQL: `npm run dev`, `npm run build`, `npm run start`
- For MongoDB: `npm run dev:mongo`, `npm run build:mongo`, `npm run start:mongo`

Both implementations provide the same functionality and user experience.