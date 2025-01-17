const voteForm = document.getElementById('voteForm');
const cardInput = document.getElementById('cardName');
const formatInput = document.getElementById('format');
const resetButton = document.getElementById('resetButton');
const formats = ['Standard', 'Modern', 'Legacy', 'Commander', 'Vintage'];

// Toggle collapsible format sections
document.querySelectorAll('.format-title').forEach(title => {
    title.addEventListener('click', () => {
        const content = title.nextElementSibling;
        content.style.display = content.style.display === 'none' ? 'block' : 'none';
    });
});

// Fetch card suggestions for autocomplete
cardInput.addEventListener('input', async (e) => {
    const query = e.target.value;

    if (!query) {
        cardSuggestions.innerHTML = '';
        return;
    }

    try {
        const response = await fetch(`https://api.scryfall.com/cards/autocomplete?q=${encodeURIComponent(query)}`);
        const data = await response.json();

        cardSuggestions.innerHTML = '';
        data.data.forEach(cardName => {
            const option = document.createElement('option');
            option.value = cardName;
            cardSuggestions.appendChild(option);
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
voteForm.addEventListener('submit', async (e) => {
    e.preventDefault();

    const cardName = cardInput.value.trim();
    const format = formatInput.value;

    if (!cardName || !format) {
        alert('Please enter a valid card name and select a format.');
        return;
    }

    try {
        const cardResponse = await fetch(`https://api.scryfall.com/cards/named?fuzzy=${encodeURIComponent(cardName)}`);
        if (!cardResponse.ok) {
            alert(`Could not find card "${cardName}". Please check the spelling and try again.`);
            return;
        }

        const cardData = await cardResponse.json();
        const formatLegality = mapFormatToScryfallKey(format);

        if (!cardData.legalities || cardData.legalities[formatLegality] !== 'legal') {
            alert(`The card "${cardName}" is not currently legal in the "${format}" format. Voting is not allowed.`);
            return;
        }

        const voteResponse = await fetch(`http://localhost:3000/add-vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardName, format }),
        });

        if (!voteResponse.ok) {
            const errorData = await voteResponse.json();
            console.error('Vote submission failed:', errorData.error || 'Unknown error');
            alert('Failed to submit the vote. Please try again.');
            return;
        }

        const result = await voteResponse.json();
        updateFormatHeader(format, result.leaderboard);
        updateFormatContent(format, result.leaderboard);
    } catch (error) {
        console.error('Error submitting the vote:', error);
        alert('Failed to add vote. Please try again later.');
    }
});

// Map format names to Scryfall legality keys
function mapFormatToScryfallKey(format) {
    const legalityMapping = {
        Standard: 'standard',
        Modern: 'modern',
        Legacy: 'legacy',
        Commander: 'commander',
        Vintage: 'vintage',
    };
    return legalityMapping[format];
}

// Reset all leaderboards
resetButton.addEventListener('click', async () => {
    if (confirm('Are you sure you want to reset all leaderboards? This cannot be undone.')) {
        try {
            const response = await fetch('http://localhost:3000/reset', { method: 'POST' });

            if (!response.ok) {
                alert('Failed to reset leaderboards.');
                return;
            }

            formats.forEach(format => {
                const formatTitle = document.querySelector(`.format-title[data-format="${format}"]`);
                const formatContent = document.querySelector(`#${format} .format-content`);

                formatTitle.textContent = `${format} (0 cards, 0 votes)`;
                formatContent.innerHTML = '<p>No votes yet.</p>';
            });

            alert('All leaderboards have been reset.');
        } catch (error) {
            console.error('Error resetting leaderboards:', error);
            alert('An error occurred while resetting the leaderboards.');
        }
    }
});

// Update format header dynamically
function updateFormatHeader(format, leaderboard) {
    const totalCards = Object.keys(leaderboard).length;
    const totalVotes = Object.values(leaderboard).reduce((sum, card) => sum + card.votes, 0);

    const formatTitle = document.querySelector(`.format-title[data-format="${format}"]`);
    formatTitle.textContent = `${format} (${totalCards} cards, ${totalVotes} votes)`;
}

// Modify vote count for a card
async function modifyVote(format, cardName, delta, votesDisplay) {
    try {
        // Send the vote modification request to the server
        const response = await fetch(`http://localhost:3000/modify-vote`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ cardName, format, delta }),
        });

        // Process server response
        if (!response.ok) {
            const errorData = await response.json();
            console.error('Error modifying vote:', errorData.error || 'Unknown error');
            alert('Failed to modify the vote. Please try again.');
            return;
        }

        // Update the vote count on success
        const result = await response.json();
        votesDisplay.textContent = `Total Votes: ${result.newVoteCount}`;
    } catch (error) {
        console.error('Error modifying vote:', error);
        alert('An error occurred while modifying the vote.');
    }
}

// Update format content dynamically
function updateFormatContent(format, leaderboard) {
    const formatContainer = document.querySelector(`#${format} .format-content`);
    formatContainer.innerHTML = '';

    Object.entries(leaderboard).forEach(([cardName, data]) => {
        const cardDiv = document.createElement('div');
        cardDiv.className = 'card';

        const cardImageDiv = document.createElement('div');
        cardImageDiv.className = 'card-image-container';
        cardImageDiv.innerHTML = `
            <img src="https://api.scryfall.com/cards/named?exact=${encodeURIComponent(cardName)}&format=image" class="card-image" alt="${cardName}">
        `;

        const cardInfoDiv = document.createElement('div');
        cardInfoDiv.className = 'card-info';

        const votesDisplay = document.createElement('p');
        votesDisplay.textContent = `Total Votes: ${data.votes}`;
        votesDisplay.className = 'vote-count';

        // Add plus and minus buttons
        const plusButton = document.createElement('button');
        plusButton.textContent = '+';
        plusButton.className = 'vote-button';
        plusButton.addEventListener('click', () => modifyVote(format, cardName, 1, votesDisplay));

        const minusButton = document.createElement('button');
        minusButton.textContent = '-';
        minusButton.className = 'vote-button';
        minusButton.addEventListener('click', () => modifyVote(format, cardName, -1, votesDisplay));

        cardInfoDiv.innerHTML = `
            <ul>
                <li><strong>${cardName}</strong></li>
            </ul>
        `;
        cardInfoDiv.appendChild(votesDisplay);
        cardInfoDiv.appendChild(plusButton);
        cardInfoDiv.appendChild(minusButton);

        cardDiv.appendChild(cardImageDiv);
        cardDiv.appendChild(cardInfoDiv);
        formatContainer.appendChild(cardDiv);
    });
}

// Initial load of all leaderboards
updateAllLeaderboards();


