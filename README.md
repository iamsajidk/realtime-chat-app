# Realtime Chat App — MongoDB Atlas & Render Deployment

This project now persists chat messages and user accounts to MongoDB.

Steps to use MongoDB Atlas and deploy on Render:

1. Create a MongoDB Atlas cluster
   - Sign in to https://www.mongodb.com/cloud/atlas and create a free cluster.
   - Under the Security section, create a Database User (username + password) with `readWrite` access to the database.
   - Under Network Access, add your IP or allow access from anywhere (not recommended for production).

2. Get the connection string
   - In Atlas, click "Connect" → "Connect your application" and copy the connection string.
   - Replace the `<password>` and `<dbname>` placeholders. Example:

   mongodb+srv://<user>:<password>@cluster0.abcd3.mongodb.net/chatapp?retryWrites=true&w=majority

3. Configure Render (or any hosting) environment variable
   - In your Render service settings, set an environment variable named `MONGODB_URI` to the Atlas connection string from step 2.
   - Do NOT include `.env` in your repo. The app reads `process.env.MONGODB_URI`.

4. Local testing (optional)
   - Create a `.env` file locally with:

     MONGODB_URI="your-atlas-connection-string"

   - Start locally:

     npm install
     node server.js

5. Deploy
   - Push to your Git remote (already done). On Render, after setting `MONGODB_URI`, trigger a deploy.

Security notes
 - Never commit real credentials. Use environment variables on the host.
 - Lock down Atlas IP access and use strong DB user passwords.

Files added/updated:
 - `server.js` (uses `process.env.MONGODB_URI`)
 - `models/User.js`, `models/Message.js`
 - `.env.example` (example local config)
 - `.gitignore`
