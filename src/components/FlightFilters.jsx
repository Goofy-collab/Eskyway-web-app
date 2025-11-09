import { useState } from 'react';
import { Filter, X, ChevronDown, ChevronUp } from 'lucide-react';

export default function FlightFilters({ 
  flights, 
  onFilterChange,
  currency = 'EUR'
}) {
  // Get min and max prices from flights
  const prices = flights.map(f => parseFloat(f.price));
  const minPrice = Math.floor(Math.min(...prices));
  const maxPrice = Math.ceil(Math.max(...prices));
  
  // Get unique airlines
  const airlines = [...new Set(flights.map(f => f.airline))].sort();
  
  // Filter states
  const [priceRange, setPriceRange] = useState([minPrice, maxPrice]);
  const [selectedAirline, setSelectedAirline] = useState(null);
  const [selectedStops, setSelectedStops] = useState(null);
  const [selectedDepartureTime, setSelectedDepartureTime] = useState(null);
  const [selectedArrivalTime, setSelectedArrivalTime] = useState(null);
  const [sortBy, setSortBy] = useState('price');
  
  // Collapsible sections
  const [openSections, setOpenSections] = useState({
    sort: true,
    price: true,
    stops: true,
    airline: true,
    departure: false,
    arrival: false
  });

  const toggleSection = (section) => {
    setOpenSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  // Time range helper
  const getTimeCategory = (timeString) => {
    const hour = new Date(timeString).getHours();
    if (hour < 6) return 'before6am';
    if (hour < 12) return '6am-12pm';
    if (hour < 18) return '12pm-6pm';
    return 'after6pm';
  };

  // Apply filters whenever they change
  const applyFilters = (newPriceRange, newAirline, newStops, newSortBy, newDepartureTime, newArrivalTime) => {
    let filtered = [...flights];

    // Filter by price
    filtered = filtered.filter(flight => {
      const price = parseFloat(flight.price);
      return price >= newPriceRange[0] && price <= newPriceRange[1];
    });

    // Filter by airline
    if (newAirline) {
      filtered = filtered.filter(flight => flight.airline === newAirline);
    }

    // Filter by stops
    if (newStops !== null) {
      filtered = filtered.filter(flight => flight.stops === newStops);
    }

    // Filter by departure time
    if (newDepartureTime) {
      filtered = filtered.filter(flight => {
        const category = getTimeCategory(flight.departure.time);
        return category === newDepartureTime;
      });
    }

    // Filter by arrival time
    if (newArrivalTime) {
      filtered = filtered.filter(flight => {
        const category = getTimeCategory(flight.arrival.time);
        return category === newArrivalTime;
      });
    }

    // Sort results
    filtered.sort((a, b) => {
      switch (newSortBy) {
        case 'price':
          return parseFloat(a.price) - parseFloat(b.price);
        case 'departure':
          return new Date(a.departure.time) - new Date(b.departure.time);
        default:
          return 0;
      }
    });

    onFilterChange(filtered);
  };

  const handlePriceChange = (e, index) => {
    const newRange = [...priceRange];
    newRange[index] = parseFloat(e.target.value);
    setPriceRange(newRange);
    applyFilters(newRange, selectedAirline, selectedStops, sortBy, selectedDepartureTime, selectedArrivalTime);
  };

  const handleAirlineSelect = (airline) => {
    const newAirline = selectedAirline === airline ? null : airline;
    setSelectedAirline(newAirline);
    applyFilters(priceRange, newAirline, selectedStops, sortBy, selectedDepartureTime, selectedArrivalTime);
  };

  const handleStopsSelect = (stops) => {
    const newStops = selectedStops === stops ? null : stops;
    setSelectedStops(newStops);
    applyFilters(priceRange, selectedAirline, newStops, sortBy, selectedDepartureTime, selectedArrivalTime);
  };

  const handleSortChange = (newSort) => {
    setSortBy(newSort);
    applyFilters(priceRange, selectedAirline, selectedStops, newSort, selectedDepartureTime, selectedArrivalTime);
  };

  const handleDepartureTimeSelect = (time) => {
    const newTime = selectedDepartureTime === time ? null : time;
    setSelectedDepartureTime(newTime);
    applyFilters(priceRange, selectedAirline, selectedStops, sortBy, newTime, selectedArrivalTime);
  };

  const handleArrivalTimeSelect = (time) => {
    const newTime = selectedArrivalTime === time ? null : time;
    setSelectedArrivalTime(newTime);
    applyFilters(priceRange, selectedAirline, selectedStops, sortBy, selectedDepartureTime, newTime);
  };

  const resetFilters = () => {
    setPriceRange([minPrice, maxPrice]);
    setSelectedAirline(null);
    setSelectedStops(null);
    setSelectedDepartureTime(null);
    setSelectedArrivalTime(null);
    setSortBy('price');
    applyFilters([minPrice, maxPrice], null, null, 'price', null, null);
  };

  const activeFilterCount = 
    (selectedAirline ? 1 : 0) + 
    (selectedStops !== null ? 1 : 0) + 
    (selectedDepartureTime ? 1 : 0) +
    (selectedArrivalTime ? 1 : 0) +
    (priceRange[0] !== minPrice || priceRange[1] !== maxPrice ? 1 : 0);

  const FilterSection = ({ title, isOpen, onToggle, children }) => (
    <div className="border-b border-gray-200 py-4">
      <button
        onClick={onToggle}
        className="flex items-center justify-between w-full text-left"
      >
        <h3 className="text-sm font-semibold text-gray-900">{title}</h3>
        {isOpen ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
      </button>
      {isOpen && <div className="mt-4">{children}</div>}
    </div>
  );

  return (
    <div className="bg-white rounded-lg shadow-lg p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <Filter className="w-5 h-5 text-purple-700" />
          <h2 className="text-xl font-bold text-gray-900">Filters</h2>
          {activeFilterCount > 0 && (
            <span className="bg-purple-700 text-white text-xs font-bold px-2 py-1 rounded-full">
              {activeFilterCount}
            </span>
          )}
        </div>
      </div>

      {/* Filter Sections - No internal scroll */}
      <div className="space-y-1">
        {/* Sort By */}
        <FilterSection 
          title="Sort By" 
          isOpen={openSections.sort} 
          onToggle={() => toggleSection('sort')}
        >
          <div className="space-y-2">
            {[
              { value: 'price', label: 'Lowest Price' },
              { value: 'departure', label: 'Departure Time' }
            ].map(option => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="sort"
                  checked={sortBy === option.value}
                  onChange={() => handleSortChange(option.value)}
                  className="w-4 h-4 accent-purple-700"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Price Range */}
        <FilterSection 
          title={`Price Range (${currency})`}
          isOpen={openSections.price} 
          onToggle={() => toggleSection('price')}
        >
          <div className="space-y-3">
            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              value={priceRange[0]}
              onChange={(e) => handlePriceChange(e, 0)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-700"
            />
            <input
              type="range"
              min={minPrice}
              max={maxPrice}
              value={priceRange[1]}
              onChange={(e) => handlePriceChange(e, 1)}
              className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer accent-purple-700"
            />
            <div className="flex justify-between text-sm font-medium text-gray-700">
              <span>{currency} {priceRange[0].toFixed(2)}</span>
              <span>{currency} {priceRange[1].toFixed(2)}</span>
            </div>
          </div>
        </FilterSection>

        {/* Stops */}
        <FilterSection 
          title="Stops" 
          isOpen={openSections.stops} 
          onToggle={() => toggleSection('stops')}
        >
          <div className="space-y-2">
            {[
              { value: 0, label: 'Non-stop' },
              { value: 1, label: '1 stop' },
              { value: 2, label: '2+ stops' }
            ].map(option => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedStops === option.value}
                  onChange={() => handleStopsSelect(option.value)}
                  className="w-4 h-4 accent-purple-700 rounded"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Airlines */}
        <FilterSection 
          title="Airlines" 
          isOpen={openSections.airline} 
          onToggle={() => toggleSection('airline')}
        >
          <div className="space-y-2">
            {airlines.map(airline => (
              <label key={airline} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedAirline === airline}
                  onChange={() => handleAirlineSelect(airline)}
                  className="w-4 h-4 accent-purple-700 rounded"
                />
                <span className="text-sm text-gray-700">{airline}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Departure Time */}
        <FilterSection 
          title="Departure Time" 
          isOpen={openSections.departure} 
          onToggle={() => toggleSection('departure')}
        >
          <div className="space-y-2">
            {[
              { value: 'before6am', label: 'Before 6AM' },
              { value: '6am-12pm', label: '6AM - 12 Noon' },
              { value: '12pm-6pm', label: '12 Noon - 6PM' },
              { value: 'after6pm', label: 'After 6PM' }
            ].map(option => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedDepartureTime === option.value}
                  onChange={() => handleDepartureTimeSelect(option.value)}
                  className="w-4 h-4 accent-purple-700 rounded"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </FilterSection>

        {/* Arrival Time */}
        <FilterSection 
          title="Arrival Time" 
          isOpen={openSections.arrival} 
          onToggle={() => toggleSection('arrival')}
        >
          <div className="space-y-2">
            {[
              { value: 'before6am', label: 'Before 6AM' },
              { value: '6am-12pm', label: '6AM - 12 Noon' },
              { value: '12pm-6pm', label: '12 Noon - 6PM' },
              { value: 'after6pm', label: 'After 6PM' }
            ].map(option => (
              <label key={option.value} className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={selectedArrivalTime === option.value}
                  onChange={() => handleArrivalTimeSelect(option.value)}
                  className="w-4 h-4 accent-purple-700 rounded"
                />
                <span className="text-sm text-gray-700">{option.label}</span>
              </label>
            ))}
          </div>
        </FilterSection>
      </div>

      {/* Reset Button */}
      {activeFilterCount > 0 && (
        <div className="mt-6 pt-4 border-t border-gray-200">
          <button
            onClick={resetFilters}
            className="w-full bg-red-50 text-red-700 hover:bg-red-100 font-medium py-2 px-4 rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <X className="w-4 h-4" />
            Reset All Filters
          </button>
        </div>
      )}
    </div>
  );
}


