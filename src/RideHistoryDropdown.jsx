import React, { useState, useEffect, useRef } from 'react';
import { collection, query, where, orderBy, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { useAuth } from './AuthContext';
import { Clock } from "lucide-react";

export default function RideHistoryDropdown() {
  const [isOpen, setIsOpen] = useState(false);
  const [rideHistory, setRideHistory] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const dropdownRef = useRef(null);
  const { currentUser } = useAuth();

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Fetch ride history when dropdown opens
  useEffect(() => {
    if (isOpen && currentUser && rideHistory.length === 0) {
      fetchRideHistory();
    }
  }, [isOpen, currentUser]);

  const fetchRideHistory = async () => {
    if (!currentUser) return;

    setIsLoading(true);
    setError(null);

    try {
      const q = query(
        collection(db, 'rideRequests'),
        where('passengerId', '==', currentUser.uid),
        where('status', '==', 'COMPLETED'),
        orderBy('completionTime', 'desc')
      );

      const querySnapshot = await getDocs(q);
      const rides = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      setRideHistory(rides);
    } catch (err) {
      console.error('Error fetching ride history:', err);
      setError('Failed to load ride history');
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'N/A';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    }).format(date);
  };

  const formatTime = (timestamp) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    return new Intl.DateTimeFormat('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true
    }).format(date);
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Ride History Button */}
      <div
        onClick={() => setIsOpen(!isOpen)}
        title="Ride History"
        className="relative flex flex-col items-center cursor-pointer transition-colors"
      >
        <Clock
          size={24}
          className={`${
            rideHistory.length > 0
              ? "text-gray-600"
              : "text-gray-600 hover:text-purple-600"
          } transition-colors`}
        />

        {/* Notification Dot */}
        {rideHistory.length > 0 && (
          <span className="absolute -top-1.5 -right-1.5 w-2.5 h-2.5 bg-purple-600 rounded-full shadow-md"></span>
        )}

        {/* Label */}
        <span className="block text-[10px] font-medium text-gray-700 text-center mt-1">
          History
        </span>
      </div>

      {/* Dropdown Panel */}
      {isOpen && (
        <div
          className="absolute right-0 mt-2 w-96 max-h-[600px] bg-white rounded-lg shadow-xl border border-gray-200 overflow-hidden z-50"
          style={{ maxWidth: 'calc(100vw - 2rem)' }}
        >
          {/* Header */}
          <div className="px-4 py-3 border-b border-gray-200 flex justify-between items-center">
            <h3 className="font-semibold text-lg text-gray-900">Ride History</h3>
            {rideHistory.length > 0 && (
              <button
                onClick={fetchRideHistory}
                className="text-purple-600 text-sm hover:text-purple-700 font-medium"
              >
                Refresh
              </button>
            )}
          </div>

          {/* Content */}
          <div className="overflow-y-auto max-h-[500px] p-3">
            {isLoading ? (
              <div className="flex items-center justify-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-700"></div>
              </div>
            ) : error ? (
              <div className="p-4 text-center">
                <p className="text-red-600 mb-3">{error}</p>
                <button
                  onClick={fetchRideHistory}
                  className="text-purple-700 hover:underline text-sm"
                >
                  Try Again
                </button>
              </div>
            ) : rideHistory.length === 0 ? (
              <div className="p-8 text-center">
                <svg
                  className="w-16 h-16 mx-auto mb-4 text-gray-300"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
                <p className="text-gray-500">No completed rides yet</p>
                <p className="text-gray-400 text-sm mt-2">
                  Your ride history will appear here
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {rideHistory.map((ride) => (
                  <div
                    key={ride.id}
                    className="p-4 bg-white border-2 border-gray-200 rounded-lg hover:border-green-300 hover:bg-green-50 transition-all duration-200 cursor-pointer"
                  >
                    {/* Date and Price */}
                    <div className="flex justify-between items-start mb-3">
                      <div>
                        <div className="font-semibold text-gray-900">
                          {formatDate(ride.timestamp || ride.completionTime)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {formatTime(ride.timestamp || ride.completionTime)}
                        </div>
                      </div>
                      {ride.price && (
                        <div className="text-purple-700 font-bold">
                          KES {ride.price.toFixed(2)}
                        </div>
                      )}
                    </div>

                    {/* Driver Info */}
                    {ride.driverName && (
                      <div className="flex items-center gap-2 mb-2 text-sm">
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
                          />
                        </svg>
                        <span className="text-gray-700">{ride.driverName}</span>
                      </div>
                    )}

                    {/* Vehicle Info */}
                    {(ride.vehicleType || ride.driverNumberPlate) && (
                      <div className="flex items-center gap-2 mb-3 text-sm">
                        <svg
                          className="w-4 h-4 text-gray-400"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"
                          />
                        </svg>
                        <span className="text-gray-700">
                          {ride.vehicleType}
                          {ride.driverNumberPlate && ` (${ride.driverNumberPlate})`}
                        </span>
                      </div>
                    )}

                    {/* Route */}
                    <div className="space-y-2 text-sm">
                      {/* Pickup */}
                      <div className="flex items-start gap-2">
                        <div className="w-3 h-3 rounded-full bg-green-500 mt-1 flex-shrink-0"></div>
                        <div className="text-gray-600 line-clamp-2">
                          {ride.pickupAddress || 'Pickup location'}
                        </div>
                      </div>

                      {/* Destination */}
                      <div className="flex items-start gap-2">
                        <div className="w-3 h-3 rounded-full bg-purple-700 mt-1 flex-shrink-0"></div>
                        <div className="text-gray-600 line-clamp-2">
                          {ride.destinationAddress || 'Destination'}
                        </div>
                      </div>
                    </div>

                    {/* Payment Method */}
                    {ride.paymentMethod && (
                      <div className="mt-3 flex items-center gap-2 text-xs text-gray-500">
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z"
                          />
                        </svg>
                        <span>{ride.paymentMethod}</span>
                      </div>
                    )}

                    {/* Status Badge */}
                    <div className="mt-3 flex justify-end">
                      <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800 border border-green-300">
                        Completed
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}





