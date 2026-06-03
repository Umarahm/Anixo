import mongoose from 'mongoose';
import dotenv from 'dotenv';
import crypto from 'crypto';
import process from 'node:process';
import User from './src/models/User.js';

dotenv.config();

const MONGO_URI = process.env.MONGO_URI;

if (!MONGO_URI) {
  console.error("MONGO_URI is missing in .env");
  process.exit(1);
}

const generateProfileId = () => {
  return crypto.randomBytes(4).toString('hex'); // 8 character hex string
};

const migrate = async () => {
  try {
    console.log("Connecting to MongoDB...");
    await mongoose.connect(MONGO_URI);
    console.log("Connected to MongoDB.");

    const users = await User.find({});
    console.log(`Found ${users.length} users.`);

    for (const user of users) {
      if (!user.profileId) {
        user.profileId = generateProfileId();
        await User.updateOne({ _id: user._id }, { $set: { profileId: user.profileId } });
        console.log(`Updated user ${user.username} with profileId: ${user.profileId}`);
        
        // Update their comments in realtimecomments
        const result = await mongoose.connection.db.collection('realtimecomments').updateMany(
          { 'user.username': user.username },
          { $set: { 'user.profileId': user.profileId } }
        );
        console.log(`Updated ${result.modifiedCount} comments for user ${user.username}.`);
      } else {
        console.log(`User ${user.username} already has profileId: ${user.profileId}`);
        // Ensure comments are updated just in case
        const result = await mongoose.connection.db.collection('realtimecomments').updateMany(
          { 'user.username': user.username, 'user.profileId': { $exists: false } },
          { $set: { 'user.profileId': user.profileId } }
        );
        if (result.modifiedCount > 0) {
            console.log(`Updated ${result.modifiedCount} comments for user ${user.username}.`);
        }
      }
    }

    console.log("Migration complete!");
    process.exit(0);
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  }
};

migrate();
