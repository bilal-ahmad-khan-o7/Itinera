async function searchHotels(reset = true) {
  console.log("searching...");
  const city = document.getElementById('cityInput').value.trim();
  const resultsContainer = document.getElementById('results');

  if (reset) {
    if (!city) return alert("Please enter a city name.");
    currentCity = city;
    currentPage = 1;
  } else {
    currentPage++;
  }

  resultsContainer.innerHTML = "Loading...";

  const prompt = `
Return ONLY a valid JSON array (no markdown, no extra text) of 100 unique hotels in ${currentCity}.
Each object must strictly follow this format:

{
  "name": "string",
  "city": "string",
  "price_per_night": 123,
  "rating": 4.5,
  "amenities": ["string", "string"],
  "available_rooms": 5,
  "address": "string",
  "contact_number": "string",
  "contact_name": "string"
}

Do not include any explanation or formatting outside the JSON array.
Page: ${currentPage}
`;

  try {
    console.log("trying...");
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer YOUR_GROQ_API_KEY_REMOVED"
      },
      body: JSON.stringify({
        model: "llama3-70b-8192",
        messages: [{ role: "user", content: prompt }]
      })
    });

    const data = await response.json();
    console.log(data);

    let content = data.choices[0].message.content.trim();
    console.log("RAW:", content);

    // Extract only the JSON array part
    const jsonMatch = content.match(/\[.*\]/s);
    if (!jsonMatch) {
      resultsContainer.innerHTML = "No valid JSON found in response.";
      return;
    }

    let hotels = [];
    try {
      hotels = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error("JSON parse error:", err);
      resultsContainer.innerHTML = "Failed to parse hotel data.";
      return;
    }

    lastFetchedHotels = hotels;

    resultsContainer.innerHTML = "";
    hotels.forEach(hotel => {
      resultsContainer.innerHTML += `
        <div class="hotel-card">
          <h2>${hotel.name}</h2>
          <p><strong>City:</strong> ${hotel.city}</p>
          <p><strong>Price/Night:</strong> ₹${hotel.price_per_night}</p>
          <p><strong>Rating:</strong> ${hotel.rating} ⭐</p>
          <p><strong>Amenities:</strong> ${hotel.amenities.join(", ")}</p>
          <p><strong>Available Rooms:</strong> ${hotel.available_rooms}</p>
          <p><strong>Address:</strong> ${hotel.address}</p>
          <p><strong>Contact:</strong> ${hotel.contact_name} (${hotel.contact_number})</p>
        </div>
      `;
    });

  } catch (error) {
    resultsContainer.innerHTML = "Failed to fetch hotels.";
    console.error(error);
  }
}
