const voteForm = document.getElementById('voteForm');
const cardInput = document.getElementById('cardName');
const formatInput = document.getElementById('format');
const leaderboard = document.getElementById('leaderboard');
const suggestionsList = document.getElementById('cardSuggestions');

// List of formats
const formats = ['Standard', 'Modern', 'Legacy', 'Pioneer', 'Historic', 'Vintage', 'Commander'];

const resetButton = document.getElementById('resetButton');

resetButton.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all leaderboards? This cannot be undone.')) {
        try {
            const response = await fetch('http://localhost:3000/reset', {
                method: 'POST',
            });

            if (response.ok) {
                alert('All leaderboards have been reset.');
                updateAllLeaderboards(); // Refresh leaderboards to show empty state
            } else {
                alert('Failed to reset leaderboards.');
            }
        } catch (error) {
            console.error('Error resetting leaderboards:', error);
            alert('An error occurred while resetting the leaderboards.');
        }
    }
});

// Fetch card suggestions for autocomplete
cardInput.addEventListener("input", async (e) => {
  const query = e.target.value;

    if (!query) {
        suggestionsList.innerHTML = '';
        return;
    }

  try {
    const response = await fetch(
      `https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(
        query
      )}`
    );
    const data = await response.json();

        suggestionsList.innerHTML = '';
        data.data.forEach(cardName => {
            const option = document.createElement('option');
            option.value = cardName;
            suggestionsList.appendChild(option);
        });
    } catch (error) {
        console.error('Error fetching card suggestions:', error);
    }
});

// Clear suggestions when card input loses focus
cardInput.addEventListener('blur', () => {
    setTimeout(() => {
        cardSuggestions.innerHTML = '';
    }, 200);
});

// Form submission handler
voteForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const cardName = cardInput.value.trim();
  const format = formatInput.value;

    // Validate card legality
    const isLegal = await checkCardLegality(cardName, format);
    if (!isLegal) {
        alert(`The card "${cardName}" is banned in the "${format}" format. Please pick a different card.`);
        return;
    }

    // Submit the vote if the card is legal
    try {
        const response = await fetch('http://localhost:3000/add-vote', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
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
        console.error('Error submitting the vote:', error);
        alert('Failed to add vote. Please try again later.');
    }
});

// Check if a card is legal in the selected format
async function checkCardLegality(cardName, format) {
    try {
        const response = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`);
        if (!response.ok) {
            console.error('Error fetching card data from Scryfall:', response.statusText);
            alert(`Could not find card "${cardName}". Please check the spelling and try again.`);
            return false;
        }

        const cardData = await response.json();

        // Map format names to Scryfall's legality keys
        const legalityMapping = {
            Standard: 'standard',
            Modern: 'modern',
            Legacy: 'legacy',
            Pioneer: 'pioneer',
            Historic: 'historic',
            Vintage: 'vintage',
            Commander: 'commander',
        };

        const legalityKey = legalityMapping[format];
        if (!legalityKey || !cardData.legalities) {
            console.error('Invalid format or missing legalities data.');
            return false;
        }

        const legality = cardData.legalities[legalityKey];
        return legality === 'legal';
    } catch (error) {
        console.error('Error checking card legality:', error);
        alert('An error occurred while checking card legality. Please try again later.');
        return false;
    }
}

// Display the leaderboard for a single format
async function displayLeaderboard(format) {
    try {
        const response = await fetch(`http://localhost:3000/leaderboard/${format}`);
        const leaderboardData = await response.json();

        const formatContainer = document.createElement('div');
        formatContainer.className = 'format-leaderboard';
        formatContainer.innerHTML = `<h2>${format} Leaderboard</h2>`;

        if (!leaderboardData || Object.keys(leaderboardData).length === 0) {
            formatContainer.innerHTML += '<p>No votes yet.</p>';
        } else {
            Object.entries(leaderboardData).forEach(([cardName, data]) => {
                const cardDiv = document.createElement('div');
                cardDiv.className = 'card';
                cardDiv.innerHTML = `
                    <strong>${cardName}</strong> - ${data.votes} votes
                    ${data.isBanned ? '<span class="banned">(Banned)</span>' : ''}
                `;
                formatContainer.appendChild(cardDiv);
            });
        }

        leaderboard.appendChild(formatContainer);
    } catch (error) {
        console.error(`Error fetching leaderboard for ${format}:`, error);
    }
}

// Update all leaderboards
async function updateAllLeaderboards() {
    leaderboard.innerHTML = ''; // Clear existing leaderboards
    for (const format of formats) {
        await displayLeaderboard(format);
    }
}

// Initial load of all leaderboards
updateAllLeaderboards();


