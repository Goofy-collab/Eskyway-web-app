import { useState, useEffect } from 'react';
import LocationInput from './LocationInput';
import { popularLocations } from '../data/locations';
//import { Plane, Calendar, User } from "lucide-react";
import { useToast } from './Toast';
import { Plane, Calendar, User } from "lucide-react";


export default function FlightSearchForm({ onSearch }) {
  const [tripType, setTripType] = useState('roundtrip');
  const [travelClass, setTravelClass] = useState('economy');
  const [fromInput, setFromInput] = useState('');
  const [toInput, setToInput] = useState('');
  const [fromLocation, setFromLocation] = useState(null);
  const [toLocation, setToLocation] = useState(null);
  const [departureDate, setDepartureDate] = useState('');
  const [returnDate, setReturnDate] = useState('');
  const [travelers, setTravelers] = useState(1);
  const [backgroundIndex, setBackgroundIndex] = useState(0);

  // Initialize toast
  const { showToast, ToastContainer } = useToast();

  const today = new Date().toISOString().split('T')[0];

  const fromSuggestions = popularLocations.filter(
    loc => loc.label.toLowerCase().includes(fromInput.toLowerCase()) && 
           loc.code !== toLocation?.code
  );

  const toSuggestions = popularLocations.filter(
    loc => loc.label.toLowerCase().includes(toInput.toLowerCase()) && 
           loc.code !== fromLocation?.code
  );

  const handleSubmit = () => {
  if (!fromLocation || !toLocation) {
    showToast('Please select valid locations from suggestions.', 'error');
    return;
  }

  // Check if origin and destination are in the same city (using city metadata)
  if (fromLocation.city && toLocation.city && fromLocation.city === toLocation.city) {
    showToast(`Cannot search flights within ${fromLocation.city}. Please select airports in different cities.`, 'error');
    return;
  }

  // Fallback: Extract city from label if city metadata doesn't exist
  if (!fromLocation.city || !toLocation.city) {
    const fromCity = fromLocation.label.split(' - ')[0].trim();
    const toCity = toLocation.label.split(' - ')[0].trim();
    
    if (fromCity === toCity) {
      showToast('Origin and destination cannot be in the same city. Please select different cities.', 'error');
      return;
    }
  }

  if (!departureDate) {
    showToast('Please select a departure date.', 'error');
    return;
  }

  if (tripType === 'roundtrip' && !returnDate) {
    showToast('Please select a return date for round trip.', 'error');
    return;
  }

  onSearch({
    origin: fromLocation.code,
    destination: toLocation.code,
    originLabel: fromLocation.label,
    destinationLabel: toLocation.label,
    departureDate,
    returnDate: tripType === 'roundtrip' ? returnDate : null,
    adults: travelers,
    travelClass,
    tripType
  });
};

  
  // list of image URLs
  const images = [
  '/images/flight1.jpg',
  '/images/flight2.jpg',
  '/images/flight3.jpg',
  '/images/flight4.jpg',
  '/images/flight5.jpg',
  '/images/flight6.jpg',
];


  // change background every 5 seconds
  useEffect(() => {
  const interval = setInterval(() => {
    setBackgroundIndex((prevIndex) => (prevIndex + 1) % images.length);
  }, 6000); // change every 6 seconds

  return () => clearInterval(interval);
}, [images.length]);

  return (
   <div className="relative min-h-screen w-full">
      {/* Toast Container */}
      <ToastContainer />

  {/* Background Images with Fade Effect */}
<div className="fixed inset-0 w-full h-full">
  {images.map((img, index) => (
    <div
      key={index}
      className={`absolute inset-0 bg-cover bg-center transition-all duration-[2000ms] ease-in-out 
        ${index === backgroundIndex 
          ? "opacity-100" 
          : "opacity-0"
        }`}
      style={{
        backgroundImage: `url(${img})`,
        backgroundSize: "cover",
        backgroundPosition: "center",
        backgroundRepeat: "no-repeat",
      }}
    />
  ))}
  {/* Overlay for better text readability */}
        <div className="absolute inset-0 bg-black bg-opacity-40" />
</div>


        
        {/*Form Container */}
         <div className="relative z-10 flex items-start justify-center pt-20 px-4 min-h-screen">
    <div className="bg-white bg-opacity-95 rounded-2xl shadow-2xl py-6 px-6 md:py-8 md:px-10 max-w-6xl w-full mx-auto">
      <div className="text-center mb-6">
        <h1 className="text-3xl md:text-4xl font-bold text-gray-900 mb-2">
           Find Your Flight
        </h1>
        <p className="text-gray-600 text-sm md:text-base">
          Search for flights to destinations worldwide
          </p>
      </div>

      <div className="space-y-4">
        {/* Trip Type Selection */}
        <div className="flex flex-wrap gap-6 items-center">
          <label className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input
              type="radio"
              name="tripType"
              value="roundtrip"
              checked={tripType === 'roundtrip'}
              onChange={(e) => setTripType(e.target.value)}
              className="w-5 h-5 accent-purple-700"
            />
            <span className="font-medium text-gray-700">Round Trip</span>
          </label>

          <label className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors">
            <input
              type="radio"
              name="tripType"
              value="oneway"
              checked={tripType === 'oneway'}
              onChange={(e) => setTripType(e.target.value)}
              className="w-5 h-5 accent-purple-700"
            />
            <span className="font-medium text-gray-700">One Way</span>
          </label>

          <select
            value={travelClass}
            onChange={(e) => setTravelClass(e.target.value)}
            className="px-4 py-2 border border-gray-300 rounded-lg font-medium text-gray-700 hover:border-purple-500 cursor-pointer outline-none transition-colors bg-white"
          >
            <option value="economy">Economy</option>
            <option value="business">Business</option>
            <option value="first">First Class</option>
          </select>
        </div>

        {/* Main Form Row */}
<div className="flex flex-wrap lg:flex-nowrap gap-3 items-end">
  {/* From */}
  <div className="flex-1 min-w-[160px]">
    <LocationInput
      label="From"
      value={fromInput}
      onChange={setFromInput}
      suggestions={fromSuggestions}
      onSelect={(loc) => {
        setFromLocation(loc);
        setFromInput(loc.label);
      }}
      placeholder="Enter departure"
      //icon="✈"
    />
  </div>

  {/* To */}
  <div className="flex-1 min-w-[160px]">
    <LocationInput
      label="To"
      value={toInput}
      onChange={setToInput}
      suggestions={toSuggestions}
      onSelect={(loc) => {
        setToLocation(loc);
        setToInput(loc.label);
      }}
      placeholder="Enter destination"
      //icon="✈"
    />
  </div>

  {/* Departure */}
<div className="w-[160px]">
  <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100 transition-all">
    <Calendar className="w-4 h-4 text-gray-500 mr-2" />
    <div className="flex-1">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
        Departure
      </label>
      <input
        type="date"
        value={departureDate}
        onChange={(e) => setDepartureDate(e.target.value)}
        min={today}
        className="w-full text-sm font-medium text-gray-900 outline-none"
      />
    </div>
  </div>
</div>
  {/* Return */}
<div className="w-[160px]">
  <div className={`flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 transition-all ${
    tripType === 'oneway'
      ? 'opacity-50 pointer-events-none'
      : 'hover:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100'
  }`}>
    <Calendar className="w-4 h-4 text-gray-500 mr-2" />
    <div className="flex-1">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
        Return
      </label>
      <input
        type="date"
        value={returnDate}
        onChange={(e) => setReturnDate(e.target.value)}
        min={departureDate || today}
        disabled={tripType === 'oneway'}
        className="w-full text-sm font-medium text-gray-900 outline-none"
      />
    </div>
  </div>
</div>


 {/* Travelers */}
<div className="w-[140px]">
  <div className="flex items-center bg-white border border-gray-200 rounded-lg px-3 py-2 hover:border-blue-500 focus-within:ring-1 focus-within:ring-blue-100 transition-all">
    <User className="w-4 h-4 text-gray-500 mr-2" />
    <div className="flex-1">
      <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-0.5">
        Travelers
      </label>
      <input
        type="number"
        value={travelers}
        onChange={(e) => setTravelers(Math.max(1, parseInt(e.target.value) || 1))}
        min="1"
        max="9"
        className="w-full text-sm font-medium text-gray-900 outline-none"
      />
    </div>
  </div>
</div>

  {/* Search Button */}
  <button
    onClick={handleSubmit}
    className="bg-purple-700 hover:bg-purple-800 text-white font-semibold py-4 px-8 rounded-lg whitespace-nowrap transition-all shadow-lg hover:shadow-xl"
  >
    Search
  </button>
</div>
      </div>
    </div>
    </div>
    </div>
    
  );
}


