import express from "express";
import cors from "cors";
import { Pool } from "pg";
import "dotenv/config";
import persianDate from "persian-date";
import cron from "node-cron";

const app = express();

// Middleware
app.use(cors());
app.use(express.json());

// PostgreSQL Database Connection
const pool = new Pool({
  user: "bdayapp",
  host: "localhost", // PostgreSQL is on the same VPS
  database: "bdayreminder",
  password: "2213", // The password you set for the user
  port: 5432, // Default PostgreSQL port
});

// Check database connection
pool
  .connect()
  .then(() => console.log("Connected to PostgreSQL"))
  .catch((err) => console.error("Error connecting to PostgreSQL:", err));

// Schedule birthday check every day at 8 AM
cron.schedule("0 8 * * *", async () => {
  try {
    const today = new persianDate();
    const month = today.month();
    const day = today.date();

    // Find today's birthdays
    const todaysBirthdays = await pool.query(
      "SELECT * FROM birthdays WHERE month = $1 AND day = $2",
      [month, day]
    );

    todaysBirthdays.rows.forEach((birthday) => {
      console.log(`Today is ${birthday.name}'s birthday!`);
    });

    // Find tomorrow's birthdays
    const tomorrow = new persianDate().add("days", 1);
    const tomorrowMonth = tomorrow.month();
    const tomorrowDay = tomorrow.date();

    const tomorrowBirthdays = await pool.query(
      "SELECT * FROM birthdays WHERE month = $1 AND day = $2",
      [tomorrowMonth, tomorrowDay]
    );

    tomorrowBirthdays.rows.forEach((birthday) => {
      console.log(`Tomorrow is ${birthday.name}'s birthday!`);
    });

    // Find next week's birthdays
    const nextWeek = new persianDate().add("days", 7);
    const nextWeekMonth = nextWeek.month();
    const nextWeekDay = nextWeek.date();

    const nextWeekBirthdays = await pool.query(
      "SELECT * FROM birthdays WHERE month = $1 AND day = $2",
      [nextWeekMonth, nextWeekDay]
    );

    nextWeekBirthdays.rows.forEach((birthday) => {
      console.log(`Next week is ${birthday.name}'s birthday!`);
    });
  } catch (error) {
    console.error("Error checking birthdays:", error);
  }
});

// Get birthdays by fingerprint
app.get("/api/birthdays/:fingerprint", async (req, res) => {
  try {
    const { fingerprint } = req.params;
    const result = await pool.query(
      "SELECT * FROM birthdays WHERE fingerprint = $1",
      [fingerprint]
    );
    res.json(result.rows);
  } catch (error) {
    res.status(500).json({ error: "Error fetching birthdays" });
  }
});

// Add new birthday
app.post("/api/birthdays", async (req, res) => {
  try {
    const { name, month, day, fingerprint } = req.body;
    await pool.query(
      "INSERT INTO birthdays (name, month, day, fingerprint) VALUES ($1, $2, $3, $4)",
      [name, month, day, fingerprint]
    );
    res.status(201).json({ message: "Birthday added" });
  } catch (error) {
    res.status(500).json({ error: "Error adding birthday" });
  }
});

// Delete birthday
app.delete("/api/birthdays/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM birthdays WHERE id = $1", [req.params.id]);
    res.json({ message: "Birthday deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting birthday" });
  }
});

// Update birthday
app.put("/api/birthdays/:id", async (req, res) => {
  try {
    const { name, month, day, fingerprint } = req.body;
    await pool.query(
      "UPDATE birthdays SET name = $1, month = $2, day = $3, fingerprint = $4 WHERE id = $5",
      [name, month, day, fingerprint, req.params.id]
    );
    res.json({ message: "Birthday updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error updating birthday" });
  }
});

// Start the server
app.listen(5000, () => {
  console.log("Server running on port 5000");
});
