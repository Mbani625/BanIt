// Import dependencies
const express = require("express");
const cors = require("cors");
const bodyParser = require("body-parser");
const axios = require("axios");

// Initialize the app
const app = express();
const port = 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());

// In-memory data storage
const cardVotes = {};
const banlist = {};
const formats = [
  "Standard",
  "Modern",
  "Legacy",
  "Pioneer",
  "Historic",
  "Vintage",
  "Commander",
];

// Function to fetch and update the banlist
async function updateBanlist() {
  try {
    const response = await axios.get(
      "https://mtgjson.com/api/v5/AllPrintings.json"
    ); // Example API for MTG data
    const data = response.data;

    // Ensure banlist is initialized for each format
    formats.forEach((format) => {
      if (!banlist[format]) {
        banlist[format] = new Set();
      }
    });

    // Assuming the API contains banlist data in a specific structure
    Object.keys(data.banlist).forEach((format) => {
      if (formats.includes(format)) {
        data.banlist[format].forEach((card) => {
          // Add card to the set
          banlist[format].add(card);
        });
      }
    });
  } catch (error) {
    console.error("Error fetching banlist:", error);
  }
}

// Initial fetch of banlist
updateBanlist();

// Route to add a card vote
app.post("/add-vote", (req, res) => {
  const { cardName, format } = req.body;

  if (!cardName || !format) {
    return res
      .status(400)
      .json({ error: "Card name and format are required." });
  }

  if (!formats.includes(format)) {
    return res.status(400).json({ error: "Invalid format." });
  }

  // Initialize format if not already present
  if (!cardVotes[format]) {
    cardVotes[format] = {};
  }

  // Initialize banlist[format] if not present
  if (!banlist[format]) {
    banlist[format] = new Set();
  }

  // Debugging: log the banlist for the format
  console.log(`Banlist for ${format}:`, banlist[format]);

  // Initialize the card vote if not already present
  if (!cardVotes[format][cardName]) {
    cardVotes[format][cardName] = {
      votes: 0,
      isBanned: banlist[format].has(cardName),
    };
  }

  // Increment the vote count
  cardVotes[format][cardName].votes++;

  // Sort cards by votes
  cardVotes[format] = Object.fromEntries(
    Object.entries(cardVotes[format]).sort(([, a], [, b]) => b.votes - a.votes)
  );

  res.json({
    message: "Vote added successfully.",
    leaderboard: cardVotes[format],
  });
});

// Route to get the leaderboard for a format
app.get("/leaderboard/:format", (req, res) => {
  const { format } = req.params;

  if (!formats.includes(format)) {
    return res.status(400).json({ error: "Invalid format." });
  }

  res.json(cardVotes[format] || {});
});

// Route to refresh banlist manually
app.post("/refresh-banlist", async (req, res) => {
  try {
    await updateBanlist();
    res.json({ message: "Banlist updated successfully." });
  } catch (error) {
    res.status(500).json({ error: "Error updating banlist." });
  }
});

// Start the server
app.listen(port, () => {
  console.log(`Server running at http://localhost:${port}`);
});

// Route to reset all votes
app.post("/reset", (req, res) => {
  Object.keys(cardVotes).forEach((format) => {
    cardVotes[format] = {};
  });
  res.json({ message: "All votes have been reset." });
});
