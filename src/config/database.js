import mongoose from "mongoose";

export async function connectDatabase(mongodbUri) {
  mongoose.set("strictQuery", true);
  await mongoose.connect(mongodbUri);
}
