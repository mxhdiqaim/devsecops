import { db, users } from "./index";

async function seed() {
  console.log("Seeding dummy users into the database...");
  
  try {
    await db.insert(users).values([
      { email: "admin@example.com", password: "Admin@example.com1" },
      { email: "adam@example.com", password: "Adam@example.com1" },
      { email: "john@example.com", password: "John@example.com1" }
    ]);
    console.log("✅ Dummy users seeded successfully!");
  } catch (err: any) {
    if (err.code === '23505') {
      console.log("⚠️ Users already exist in the database. Skipping seed.");
    } else {
      console.error("❌ Error seeding database:", err);
    }
  }
  
  process.exit(0);
}

seed();