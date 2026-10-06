import mongoose from "mongoose";

interface MongooseCache {
  conn: typeof mongoose | null;
  promise: Promise<typeof mongoose> | null;
}

declare global {
  // eslint-disable-next-line no-var
  var mongooseCache: MongooseCache | undefined;
}

const globalCache: MongooseCache = global.mongooseCache || { conn: null, promise: null };
global.mongooseCache = globalCache;

export async function connectDB() {
  const uri = process.env.MONGODB_URI;

  if (!uri) {
    throw new Error("Please define the MONGODB_URI environment variable inside .env.local");
  }

  if (globalCache.conn) {
    return globalCache.conn;
  }

  if (!globalCache.promise) {
    globalCache.promise = mongoose.connect(uri, { bufferCommands: false }).then((m) => m);
  }

  try {
    globalCache.conn = await globalCache.promise;
  } catch (error) {
    globalCache.promise = null;
    throw error;
  }

  return globalCache.conn;
}

export default connectDB;
