import RateLimit from "@/models/RateLimit";

export async function consumeRateLimit(
  userId: string,
  action: string,
  limit: number,
  windowMs: number
) {
  const now = Date.now();
  const windowNumber = Math.floor(now / windowMs);
  const key = `${userId}:${action}:${windowNumber}`;
  const expiresAt = new Date((windowNumber + 1) * windowMs);
  const result = await RateLimit.findOneAndUpdate(
    { key },
    { $inc: { count: 1 }, $setOnInsert: { expiresAt } },
    { upsert: true, returnDocument: "after" }
  ).lean();

  return (result?.count || 0) <= limit;
}