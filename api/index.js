require("dotenv").config();
const express = require("express");
const mongoose = require("mongoose");

const app = express();

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true, useUnifiedTopology: true })
    .then(() => console.log("Connected to MongoDB"))
    .catch(error => console.error("Failed to connect to MongoDB:", error));

app.get("/check-db", async (req, res) => {
    try {
        const result = await mongoose.connection.db.collection("postbacks").findOne();
        res.send(result ? "DB is reachable!" : "DB is empty!");
    } catch (error) {
        console.error("Error accessing the database:", error);
        res.status(500).send("Error accessing the database: " + error.message);
    }
});

app.listen(3000, () => console.log("Server ready on port 3000."));

module.exports = app;
