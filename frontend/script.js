const voteForm = document.getElementById("voteForm");
const cardInput = document.getElementById("cardName");
const formatInput = document.getElementById("format");
const leaderboard = document.getElementById("leaderboard");
const suggestionsList = document.getElementById("cardSuggestions");

// List of formats
const formats = [
  "Standard",
  "Modern",
  "Commander",
  "Legacy",
  "Pioneer",
  "Vintage",
];

const resetButton = document.getElementById("resetButton");

resetButton.addEventListener("click", async () => {
  if (
    confirm(
      "Are you sure you want to reset all leaderboards? This cannot be undone."
    )
  ) {
    try {
      const response = await fetch("http://localhost:3000/reset", {
        method: "POST",
      });

      if (response.ok) {
        alert("All leaderboards have been reset.");
        updateAllLeaderboards(); // Refresh leaderboards to show empty state
      } else {
        alert("Failed to reset leaderboards.");
      }
    } catch (error) {
      console.error("Error resetting leaderboards:", error);
      alert("An error occurred while resetting the leaderboards.");
    }
  }
});

// Fetch card suggestions for autocomplete
cardInput.addEventListener("input", async (e) => {
  const query = e.target.value;

  if (!query) {
    suggestionsList.innerHTML = "";
    return;
  }

  try {
    const response = await fetch(
      `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(
        query
      )}`
    );
    const data = await response.json();

    suggestionsList.innerHTML = "";
    data.data.forEach((cardName) => {
      const option = document.createElement("option");
      option.value = cardName;
      suggestionsList.appendChild(option);
    });
  } catch (error) {
    console.error("Error fetching card suggestions:", error);
  }
});

// Form submission handler
voteForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const cardName = cardInput.value.trim();
  const format = formatInput.value;

  // Validate card legality
  const isLegal = await checkCardLegality(cardName, format);
  if (!isLegal) {
    alert(
      `The card "${cardName}" is banned in the "${format}" format. Please pick a different card.`
    );
    return;
  }

  // Submit the vote if the card is legal
  try {
    const response = await fetch("http://localhost:3000/add-vote", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cardName, format }),
    });

    const result = await response.json();

    if (response.ok) {
      updateAllLeaderboards();
    } else {
      alert(result.error);
    }
  } catch (error) {
    console.error("Error submitting the vote:", error);
    alert("Failed to add vote. Please try again later.");
  }
});

// Check if a card is legal in the selected format
async function checkCardLegality(cardName, format) {
  try {
    const response = await fetch(
      `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(
        cardName
      )}`
    );
    if (!response.ok) {
      console.error(
        "Error fetching card data from Scryfall:",
        response.statusText
      );
      alert(
        `Could not find card "${cardName}". Please check the spelling and try again.`
      );
      return false;
    }

    const cardData = await response.json();

    // Map format names to Scryfall's legality keys
    const legalityMapping = {
      Standard: "standard",
      Modern: "modern",
      Legacy: "legacy",
      Pioneer: "pioneer",
      Historic: "historic",
      Vintage: "vintage",
      Commander: "commander",
    };

    const legalityKey = legalityMapping[format];
    if (!legalityKey || !cardData.legalities) {
      console.error("Invalid format or missing legalities data.");
      return false;
    }

    const legality = cardData.legalities[legalityKey];
    return legality === "legal";
  } catch (error) {
    console.error("Error checking card legality:", error);
    alert(
      "An error occurred while checking card legality. Please try again later."
    );
    return false;
  }
}

// Display the leaderboard for a single format
async function displayLeaderboard(format) {
  try {
    const response = await fetch(`http://localhost:3000/leaderboard/${format}`);
    const leaderboardData = await response.json();

    // Create a format container for each format
    const formatContainer = document.createElement("div");
    formatContainer.className = "format-leaderboard";

    // Create the format heading and add the "No Changes" button with tally next to it
    const noChangesTally = leaderboardData.noChangesTally || 0; // Default to 0 if not set
    const headingHtml = `
        <h2>${format} Leaderboard
          <button id="noChangesButton-${format}" class="no-changes">
            No Changes: <span id="noChangesTally-${format}">${noChangesTally}</span>
          </button>
        </h2>
      `;
    formatContainer.innerHTML = headingHtml;

    const leaderboard = document.createElement("div");
    leaderboard.className = "leaderboard";

    if (!leaderboardData || Object.keys(leaderboardData).length === 0) {
      formatContainer.innerHTML += "<p>No votes yet.</p>";
    } else {
      for (const [cardName, data] of Object.entries(leaderboardData)) {
        // Fetch card data from Scryfall API for image
        const cardResponse = await fetch(
          `https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(
            cardName
          )}`
        );
        const cardData = await cardResponse.json();

        // Initialize a variable for storing all images
        let cardImageHtml = "";

        // Check if the card is a split card
        if (cardData.layout === "split") {
          // For split cards, display the shared card face and split names
          const cardImageUrl = cardData.image_uris
            ? cardData.image_uris.normal
            : null;
          if (cardImageUrl) {
            // Remove any leading/trailing spaces from the names
            const names = cardName.split(" & ").map((name) => name.trim());

            cardImageHtml = `
                  <div class="split-card">
                    <img src="${cardImageUrl}" alt="${cardName}" class="card-image">
                  </div>
                `;
          }
        } else if (cardData.card_faces) {
          // For double-faced cards, show the front face initially
          const frontFaceImageUrl = cardData.card_faces[0].image_uris
            ? cardData.card_faces[0].image_uris.normal
            : null;

          if (frontFaceImageUrl) {
            cardImageHtml = `
                <div class="double-faced-card">
                  <img src="${frontFaceImageUrl}" alt="${cardName} Front" class="card-image front-face">
                </div>
              `;
          }

          // Show both faces on hover
          const backFaceImageUrl = cardData.card_faces[1]?.image_uris
            ? cardData.card_faces[1].image_uris.normal
            : null;

          if (backFaceImageUrl) {
            cardImageHtml += `
                <div class="back-face">
                  <img src="${backFaceImageUrl}" alt="${cardName} Back" class="card-image back-face">
                </div>
              `;
          }
        } else {
          // For single-faced cards
          const cardImageUrl = cardData.image_uris
            ? cardData.image_uris.normal
            : null;
          if (cardImageUrl) {
            cardImageHtml = `<img src="${cardImageUrl}" alt="${cardName}" class="card-image">`;
          }
        }

        const cardDiv = document.createElement("div");
        cardDiv.className = "card";
        cardDiv.innerHTML = `
              <strong>${cardName}</strong>
              ${cardImageHtml}
              <div class="ban-counter">
                Ban Counter: ${data.votes} votes
              </div>
            `;
        leaderboard.appendChild(cardDiv);
      }
    }

    // Append the leaderboard to the format container
    formatContainer.appendChild(leaderboard);

    // Append the format container to the leaderboard section
    const leaderboardSection = document.getElementById("leaderboard");
    leaderboardSection.appendChild(formatContainer);

    // Add event listeners for "No Changes" button
    const noChangesButton = document.getElementById(
      `noChangesButton-${format}`
    );
    const noChangesTallyElement = document.getElementById(
      `noChangesTally-${format}`
    );

    noChangesButton.addEventListener("click", () => {
      let tally = parseInt(noChangesTallyElement.innerText, 10) || 0;
      tally++;

      // Update the tally
      noChangesTallyElement.innerText = tally;

      // Optionally, store the tally in localStorage or database
      // localStorage.setItem(format, tally);
    });

    // Handle form submission and clear the card name input field
    const voteForm = document.getElementById("voteForm");
    const cardNameInput = document.getElementById("cardName");

    voteForm.addEventListener("submit", (event) => {
      // Prevent form submission (default behavior)
      event.preventDefault();

      // Here, you would normally handle submitting the vote.
      // For now, we're just clearing the input field after the submit.
      cardNameInput.value = ""; // Clear the input field after submission
    });
  } catch (error) {
    console.error(`Error fetching leaderboard for ${format}:`, error);
  }
}

// Update all leaderboards
async function updateAllLeaderboards() {
  leaderboard.innerHTML = ""; // Clear existing leaderboards
  for (const format of formats) {
    await displayLeaderboard(format);
  }
}

// Initial load of all leaderboards
updateAllLeaderboards();
