import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../AuthContext';
import { db } from '../firebase';
import { collection, query, where, orderBy, onSnapshot, deleteDoc, doc } from 'firebase/firestore';
import { Bookmark } from "lucide-react";

export default function SavedFlightsDropdown() {
  const { currentUser } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [savedFlights, setSavedFlights] = useState([]);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch saved flights
  useEffect(() => {
    if (!currentUser) return;

    const q = query(
      collection(db, 'flightSavings'),
      where('userId', '==', currentUser.uid),
      orderBy('savedAt', 'desc')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const flights = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSavedFlights(flights);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [currentUser]);

  const deleteSavedFlight = async (flightId, event) => {
    event.stopPropagation();
    try {
      await deleteDoc(doc(db, 'flightSavings', flightId));
    } catch (error) {
      console.error('Error deleting saved flight:', error);
      alert('Failed to delete flight');
    }
  };

  const formatTime = (dateString) => {
    return new Date(dateString).toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false
    });
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric'
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Saved Flights Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        title="Saved Flights"
        className="relative flex flex-col items-center cursor-pointer transition-colors"
      >
        <Bookmark
          size={24}
          className={`${
            savedFlights.length > 0
              ? "text-gray-600"
              : "text-gray-600 hover:text-purple-600"
          } transition-colors`}
        />

        {/* Count Badge */}
        {savedFlights.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 inline-flex items-center justify-center w-5 h-5 text-xs font-bold text-white bg-purple-600 rounded-full shadow-md">
            {savedFlights.length > 9 ? "9+" : savedFlights.length}
          </span>
        )}

        {/* Label */}
        <span className="block text-[10px] font-medium text-gray-700 text-center mt-1">
          Saved
        </span>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 w-[500px] bg-white rounded-lg shadow-2xl border border-gray-200 z-50 max-h-[600px] flex flex-col animate-slideDown">
          {/* Header */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Saved Flights</h3>
            <span className="text-sm text-gray-500">{savedFlights.length} flights</span>
          </div>

          {/* Flights List */}
          <div className="overflow-y-auto flex-1 p-3">
            {loading ? (
              <div className="flex items-center justify-center p-8">
                <div className="w-8 h-8 border-4 border-gray-200 border-t-purple-700 rounded-full animate-spin"></div>
              </div>
            ) : savedFlights.length === 0 ? (
              <div className="text-center p-8">
                {/* <div className="text-4xl mb-2">💔</div> */}
                <p className="text-gray-500 text-sm">No saved flights yet</p>
                <p className="text-gray-400 text-xs mt-1">Save flights to view them here</p>
              </div>
            ) : (
              <div className="space-y-3">
                {savedFlights.map((flight) => (
                  <div
                    key={flight.id}
                    className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 cursor-pointer"
                  >
                    {/* Flight Header */}
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-center gap-2">
                        {/* <div className="text-xl">✈️</div> */}
                        <div>
                          <div className="font-semibold text-gray-900 text-sm">
                            {flight.airline}
                          </div>
                          <div className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block mt-1 ${
                            flight.hasReturn 
                              ? 'bg-blue-100 text-blue-700 border border-blue-300' 
                              : 'bg-yellow-100 text-yellow-700 border border-yellow-300'
                          }`}>
                            {flight.hasReturn ? 'Round Trip' : 'One Way'}
                          </div>
                        </div>
                      </div>

                      {/* Price & Delete */}
                      <div className="flex items-center gap-2">
                        <div className="text-right">
                          <div className="font-bold text-green-600 text-sm">
                            {flight.currency} {flight.price}
                          </div>
                        </div>
                        <button
                          onClick={(e) => deleteSavedFlight(flight.id, e)}
                          className="text-gray-400 hover:text-red-600 transition-colors p-1"
                          title="Remove"
                        >
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Outbound Flight */}
                    <div className="mb-2">
                      <div className="text-xs text-gray-500 mb-1 font-medium">
                        {formatDate(flight.departureTime)}
                      </div>
                      <div className="flex items-center gap-2 text-sm">
                        <div className="font-semibold text-gray-900">{flight.departureAirport}</div>
                        <div className="text-gray-400">{formatTime(flight.departureTime)}</div>
                        <div className="flex-1 border-t border-gray-300 relative">
                          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-[4px] border-l-gray-300 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent"></div>
                        </div>
                        <div className="font-semibold text-gray-900">{flight.arrivalAirport}</div>
                        <div className="text-gray-400">{formatTime(flight.arrivalTime)}</div>
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}
                      </div>
                    </div>

                    {/* Return Flight */}
                    {flight.hasReturn && (
                      <div className="pt-2 border-t border-gray-200 mt-2">
                        <div className="text-xs text-gray-500 mb-1 font-medium">
                          {formatDate(flight.returnDepartureTime)}
                        </div>
                        <div className="flex items-center gap-2 text-sm">
                          <div className="font-semibold text-gray-900">{flight.returnDepartureAirport}</div>
                          <div className="text-gray-400">{formatTime(flight.returnDepartureTime)}</div>
                          <div className="flex-1 border-t border-gray-300 relative">
                            <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-[4px] border-l-gray-300 border-t-[3px] border-t-transparent border-b-[3px] border-b-transparent"></div>
                          </div>
                          <div className="font-semibold text-gray-900">{flight.returnArrivalAirport}</div>
                          <div className="text-gray-400">{formatTime(flight.returnArrivalTime)}</div>
                        </div>
                        <div className="text-xs text-gray-500 mt-1">
                          {flight.returnStops === 0 ? 'Direct' : `${flight.returnStops} stop${flight.returnStops > 1 ? 's' : ''}`}
                        </div>
                      </div>
                    )}

                    {/* Saved Date */}
                    <div className="text-xs text-gray-400 mt-3 pt-2 border-t border-gray-100">
                       Saved on {new Date(flight.savedAt).toLocaleDateString('en-US', {
                        month: 'short',
                        day: 'numeric',
                        year: 'numeric'
                      })}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideDown {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideDown {
          animation: slideDown 0.2s ease-out;
        }
      `}</style>
    </div>
  );
}



