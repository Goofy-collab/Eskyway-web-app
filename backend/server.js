require("dotenv").config();
const express = require("express");
const axios = require("axios");
const cors = require("cors");

// Allow your frontend domain
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5000',
  'https://eskyway-web-app.vercel.app/'
];

const app = express();
const PORT = 5000;

// Enable CORS
app.use(cors(
  {
  origin: function(origin, callback) {
    // Allow requests with no origin (like mobile apps or curl requests)
    if (!origin) return callback(null, true);
    
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}
));

// Amadeus credentials
const AMADEUS_CLIENT_ID = process.env.AMADEUS_CLIENT_ID;
const AMADEUS_CLIENT_SECRET = process.env.AMADEUS_CLIENT_SECRET;

// Debug: Check if environment variables are loaded
//console.log("Amadeus Client ID:", AMADEUS_CLIENT_ID ? "Loaded" : "Missing");
//console.log("Amadeus Client Secret:", AMADEUS_CLIENT_SECRET ? "Loaded" : "Missing");

if (!AMADEUS_CLIENT_ID || !AMADEUS_CLIENT_SECRET) {
  console.error("Missing Amadeus credentials in .env file");
  process.exit(1);
}

// Get access token
async function getAccessToken() {
  try {
    const response = await axios.post(
      "https://test.api.amadeus.com/v1/security/oauth2/token",
      new URLSearchParams({
        grant_type: "client_credentials",
        client_id: AMADEUS_CLIENT_ID,
        client_secret: AMADEUS_CLIENT_SECRET
      })
    );
    console.log("Successfully obtained access token");
    return response.data.access_token;
  } catch (error) {
    console.error("Error getting access token:", error.response?.data || error.message);
    throw error;
  }
}

// Health check endpoint 
app.get("/health", (req, res) => {
  res.json({ 
    status: "OK", 
    timestamp: new Date().toISOString(),
    message: "Server is running successfully" 
  });
});

// Flight search endpoint
app.get("/flights", async (req, res) => {
  try {
    console.log("Flight search request received:", req.query);
    
    const { origin, destination, departureDate, returnDate, adults, travelClass } = req.query;

    // Validate required parameters
    if (!origin || !destination || !departureDate) {
      return res.status(400).json({ 
        error: "Missing required parameters: origin, destination, and departureDate" 
      });
    }

    const token = await getAccessToken();

    const params = {
      originLocationCode: origin,
      destinationLocationCode: destination,
      departureDate,
      adults: adults || 1,
      max: 50 // limit results for testing
    };

    if (returnDate && returnDate !== "") {
      params.returnDate = returnDate;
    }
    
    if (travelClass && travelClass !== "") {
      params.travelClass = travelClass.toUpperCase();
    }

    console.log("📡 Calling Amadeus API with params:", params);

    const amadeusRes = await axios.get(
      "https://test.api.amadeus.com/v2/shopping/flight-offers",
      {
        headers: { Authorization: `Bearer ${token}` },
        params
      }
    );

    console.log(`Amadeus API returned ${amadeusRes.data.data?.length || 0} flight offers`);


    if (!amadeusRes.data.data || amadeusRes.data.data.length === 0) {
      return res.json([]);
    }
    
    //  Simplify results for frontend
const simplified = amadeusRes.data.data.map(offer => {
  const outboundItinerary = offer.itineraries[0];
  const outboundSegment = outboundItinerary.segments[0];

  let returnData = null;
  if (offer.itineraries.length > 1) {
    const returnItinerary = offer.itineraries[1];
    const returnSegment = returnItinerary.segments[0];
    returnData = {
      departure: {
        airport: returnSegment.departure.iataCode,
        time: returnSegment.departure.at
      },
      arrival: {
        airport: returnSegment.arrival.iataCode,
        time: returnSegment.arrival.at
      },
      stops: returnItinerary.segments.length - 1
    };
  }

  return {
    airline: outboundSegment.carrierCode,
    departure: {
      airport: outboundSegment.departure.iataCode,
      time: outboundSegment.departure.at
    },
    arrival: {
      airport: outboundSegment.arrival.iataCode,
      time: outboundSegment.arrival.at
    },
    stops: outboundItinerary.segments.length - 1,
    price: offer.price.total,
    currency: offer.price.currency,
    return: returnData 
  };
});


    res.json(simplified);

  } catch (err) {
    console.error("Error fetching flights:");
    console.error("Status:", err.response?.status);
    console.error("Data:", err.response?.data);
    console.error("Message:", err.message);
    
    res.status(500).json({ 
      error: "Failed to fetch flights",
      details: err.response?.data?.error_description || err.message
    });
  }
});

// Start server - ONLY ONE app.listen()
app.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`Health check: http://localhost:${PORT}/health`);
  console.log(`Flight search: http://localhost:${PORT}/flights`);
});


// app.listen(PORT, () => {
//   console.log(`Server running at http://localhost:${PORT}`);
// });
