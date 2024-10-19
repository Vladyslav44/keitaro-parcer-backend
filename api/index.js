require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();

mongoose.connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("Successfully connected to MongoDB");
        app.listen(3000, () => console.log("Server ready on port 3000."));
    })
    .catch((error) => {
        console.error("Failed to connect to MongoDB:", error);
        process.exit(1);
    });
app.get("/", (req, res) => res.send("Express on Vercel =)"));
app.get("/check-db", async (req, res) => {
    try {
        const result = await mongoose.connection.db.collection("postbacks").findOne();
        res.send(result ? "DB is reachable!" : "DB is empty!");
    } catch (error) {
        res.status(500).send("Error accessing the database: " + error);
    }
});

module.exports = app;
