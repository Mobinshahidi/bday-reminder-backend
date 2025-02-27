import express from "express";
import cors from "cors";
import pkg from "pg";
import "dotenv/config";
import persianDate from "persian-date";
import cron from "node-cron";
import { encryptData, decryptData } from "./crypto.js";

const { Pool } = pkg;
const app = express();

// Middleware
app.use(
  cors({
    origin: [
      "https://bday-reminder.mobinshahidi.ir",
      "https://api.mobinshahidi.ir",
      "http://bday-reminder.mobinshahidi.ir",
      "http://api.mobinshahidi.ir",
    ],
    methods: ["GET", "POST", "PUT", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.options("*", cors());
app.use(express.json());

// PostgreSQL Database Connection
const pool = new Pool({
  user: process.env.DB_USER,
  host: "localhost",
  database: process.env.DB_NAME,
  password: process.env.DB_PASS,
  port: 5432,
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
      console.log(`Today is ${decryptData(birthday.name)}'s birthday!`);
    });
  } catch (error) {
    console.error("Error checking birthdays:", error);
  }
});

// ✅ **Get birthdays by fingerprint (Decrypt Names)**
app.get("/api/birthdays/:fingerprint", async (req, res) => {
  try {
    const { fingerprint } = req.params;
    const result = await pool.query(
      "SELECT * FROM birthdays WHERE fingerprint = $1",
      [fingerprint]
    );

    // Decrypt each birthday name before sending response
    const decryptedBirthdays = result.rows.map((birthday) => ({
      ...birthday,
      name: decryptData(birthday.name), // Decrypt name
    }));

    res.json(decryptedBirthdays);
  } catch (error) {
    res.status(500).json({ error: "Error fetching birthdays" });
  }
});

// ✅ **Add new birthday (Encrypt Before Storing)**
app.post("/api/birthdays", async (req, res) => {
  try {
    const { name, month, day, fingerprint } = req.body;
    const encryptedName = encryptData(name); // Encrypt name before storing

    await pool.query(
      "INSERT INTO birthdays (name, month, day, fingerprint) VALUES ($1, $2, $3, $4)",
      [encryptedName, month, day, fingerprint]
    );

    res.status(201).json({ message: "Birthday added" });
  } catch (error) {
    res.status(500).json({ error: "Error adding birthday" });
  }
});

// ✅ **Delete birthday**
app.delete("/api/birthdays/:id", async (req, res) => {
  try {
    await pool.query("DELETE FROM birthdays WHERE id = $1", [req.params.id]);
    res.json({ message: "Birthday deleted successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error deleting birthday" });
  }
});

// ✅ **Update birthday (Encrypt Before Storing)**
app.put("/api/birthdays/:id", async (req, res) => {
  try {
    const { name, month, day, fingerprint } = req.body;
    const encryptedName = encryptData(name); // Encrypt before updating

    await pool.query(
      "UPDATE birthdays SET name = $1, month = $2, day = $3, fingerprint = $4 WHERE id = $5",
      [encryptedName, month, day, fingerprint, req.params.id]
    );

    res.json({ message: "Birthday updated successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error updating birthday" });
  }
});

// ✅ **Import birthdays (Encrypt Names Before Storing)**
app.post("/api/birthdays/import", async (req, res) => {
  try {
    const { birthdays, fingerprint } = req.body;

    if (!Array.isArray(birthdays) || !fingerprint) {
      return res.status(400).json({ error: "Invalid import data format" });
    }

    // Encrypt each name before inserting
    const values = birthdays
      .map(
        (birthday) =>
          `('${encryptData(birthday.name)}', ${birthday.month}, ${
            birthday.day
          }, '${fingerprint}')`
      )
      .join(",");

    const query = `INSERT INTO birthdays (name, month, day, fingerprint) VALUES ${values}`;
    await pool.query(query);

    res.status(201).json({ message: "Birthdays imported successfully" });
  } catch (error) {
    res.status(500).json({ error: "Error importing birthdays" });
  }
});

// ✅ **Export birthdays (Decrypt Names Before Sending)**
app.get("/api/birthdays/export/:fingerprint", async (req, res) => {
  try {
    const { fingerprint } = req.params;
    const result = await pool.query(
      "SELECT * FROM birthdays WHERE fingerprint = $1",
      [fingerprint]
    );

    // Decrypt each birthday before exporting
    const decryptedData = result.rows.map((birthday) => ({
      ...birthday,
      name: decryptData(birthday.name),
    }));

    res.json(decryptedData);
  } catch (error) {
    res.status(500).json({ error: "Error exporting birthdays" });
  }
});

// ✅ **Start the server**
app.listen(process.env.PORT || 5000, () => {
  console.log(`Server running on port ${process.env.PORT || 5000}`);
});
