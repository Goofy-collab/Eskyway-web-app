const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;


export const searchFlights = async (params) => {
  try {
    const url = new URL(`${API_BASE_URL}/flights`);
    url.searchParams.append('origin', params.origin);
    url.searchParams.append('destination', params.destination);
    url.searchParams.append('departureDate', params.departureDate);
    url.searchParams.append('adults', params.adults);
    url.searchParams.append('travelClass', params.travelClass);
    
    if (params.returnDate) {
      url.searchParams.append('returnDate', params.returnDate);
    }

    const response = await fetch(url);
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.error || `HTTP error: ${response.status}`);
    }
    
    const data = await response.json();
    
    // Handle empty results gracefully
    if (!data || !Array.isArray(data) || data.length === 0) {
      console.log(`No flights found for ${params.travelClass} class`);
      return []; // Return empty array
    }

    return data;
    
  } catch (error) {
    console.error('Flight search error:', error);
    throw error;
  }
};

// const API_BASE_URL = 'http://localhost:5000';

// export const searchFlights = async (params) => {
//   const url = new URL(`${API_BASE_URL}/flights`);
//   url.searchParams.append('origin', params.origin);
//   url.searchParams.append('destination', params.destination);
//   url.searchParams.append('departureDate', params.departureDate);
//   url.searchParams.append('adults', params.adults);
//   url.searchParams.append('travelClass', params.travelClass);
  
//   if (params.returnDate) {
//     url.searchParams.append('returnDate', params.returnDate);
//   }

//   const response = await fetch(url);
//   if (!response.ok) throw new Error(`HTTP error: ${response.status}`);
  
//   return await response.json();
// };