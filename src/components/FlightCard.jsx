import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, addDoc, query, where, getDocs, deleteDoc, doc, onSnapshot } from 'firebase/firestore';
import { useAuth } from '../AuthContext';

export default function FlightCard({ flight, index, searchParams, showToast }) {
  const { currentUser } = useAuth();
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [savedDocId, setSavedDocId] = useState(null);

  // Generate unique flight ID
  const flightId = `${flight.airline}-${flight.departure.airport}-${flight.arrival.airport}-${flight.departure.time}`;

  // Check if flight is already saved when component mounts or user changes
  useEffect(() => {
    if (!currentUser) {
      setSaved(false);
      setSavedDocId(null);
      return;
    }

    const checkIfSaved = async () => {
      try {
        const q = query(
          collection(db, 'flightSavings'),
          where('userId', '==', currentUser.uid),
          where('flightId', '==', flightId)
        );

        const querySnapshot = await getDocs(q);
        
        if (!querySnapshot.empty) {
          setSaved(true);
          setSavedDocId(querySnapshot.docs[0].id);
        } else {
          setSaved(false);
          setSavedDocId(null);
        }
      } catch (error) {
        console.error('Error checking saved status:', error);
      }
    };

    checkIfSaved();
  }, [currentUser, flightId]);

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

  const calculateDuration = (departure, arrival) => {
    const dep = new Date(departure);
    const arr = new Date(arrival);
    const diffMs = arr - dep;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
    return `${diffHours}h ${diffMinutes}m`;
  };

  const hasReturn = flight.return && typeof flight.return === 'object';

  const handleSaveFlight = async () => {
    if (!currentUser) {
      showToast('Please log in to save flights', 'error');
      return;
    }

    setSaving(true);

    try {
      if (saved && savedDocId) {
        // Flight is saved - remove it (unsave)
        await deleteDoc(doc(db, 'flightSavings', savedDocId));
        setSaved(false);
        setSavedDocId(null);
        showToast('Flight removed from saved flights', 'info');
      } else {
        // Save the flight
        const flightData = {
          userId: currentUser.uid,
          userEmail: currentUser.email,
          flightId: flightId,
          
          // Flight details
          airline: flight.airline,
          price: flight.price,
          currency: flight.currency,
          stops: flight.stops,
          
          // Departure details
          departureAirport: flight.departure.airport,
          departureTime: flight.departure.time,
          
          // Arrival details
          arrivalAirport: flight.arrival.airport,
          arrivalTime: flight.arrival.time,
          
          // Return flight details (if exists)
          hasReturn: hasReturn,
          returnDepartureAirport: hasReturn ? flight.return.departure.airport : null,
          returnDepartureTime: hasReturn ? flight.return.departure.time : null,
          returnArrivalAirport: hasReturn ? flight.return.arrival.airport : null,
          returnArrivalTime: hasReturn ? flight.return.arrival.time : null,
          returnStops: hasReturn ? flight.return.stops : null,
          
          // Search parameters
          origin: searchParams?.origin || flight.departure.airport,
          destination: searchParams?.destination || flight.arrival.airport,
          originLabel: searchParams?.originLabel || flight.departure.airport,
          destinationLabel: searchParams?.destinationLabel || flight.arrival.airport,
          departureDate: searchParams?.departureDate || new Date(flight.departure.time).toISOString().split('T')[0],
          returnDate: searchParams?.returnDate || null,
          adults: searchParams?.adults || 1,
          travelClass: searchParams?.travelClass || 'economy',
          tripType: searchParams?.tripType || (hasReturn ? 'roundtrip' : 'oneway'),
          
          // Metadata
          savedAt: Date.now(),
          timestamp: new Date().toISOString()
        };

        const docRef = await addDoc(collection(db, 'flightSavings'), flightData);
        setSaved(true);
        setSavedDocId(docRef.id);
        showToast('Flight saved successfully!', 'success');
      }
    } catch (error) {
      console.error('Error saving flight:', error);
      showToast('Failed to save flight. Please try again.', 'error');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div 
      className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 opacity-0 animate-fadeIn"
      style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border-b border-gray-100 gap-2">
        <div className="flex items-center gap-3">
          <div>
            <div className="text-base font-semibold text-gray-900">{flight.airline}</div>
            <div className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${
              hasReturn ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'
            }`}>
              {hasReturn ? 'ROUND TRIP' : 'ONE WAY'}
            </div>
          </div>
        </div>
        <div className="text-right">
          <div className="text-xl font-bold text-green-600">
            {flight.currency} {flight.price}
          </div>
          <div className="text-xs text-gray-500">Total for all passengers</div>
        </div>
      </div>

      {/* Flight Segments */}
      <div className="p-3 space-y-3">
        {/* Outbound Flight */}
        <div>
          {hasReturn && (
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Outbound</span>
              <span className="text-xs font-medium text-gray-700">{formatDate(flight.departure.time)}</span>
            </div>
          )}
          
          <div className="flex items-center gap-3">
            <div className="text-center min-w-[70px]">
              <div className="text-base font-bold text-gray-900">{flight.departure.airport}</div>
              <div className="text-xs text-gray-500">{formatTime(flight.departure.time)}</div>
            </div>
            
            <div className="flex-1 flex flex-col items-center gap-1">
              <div className="text-xs font-medium text-gray-500">{calculateDuration(flight.departure.time, flight.arrival.time)}</div>
              <div className="w-full h-0.5 bg-gray-200 relative">
                <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-[6px] border-l-gray-200 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent"></div>
              </div>
              <div className="text-xs text-gray-500">{flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</div>
            </div>
            
            <div className="text-center min-w-[70px]">
              <div className="text-base font-bold text-gray-900">{flight.arrival.airport}</div>
              <div className="text-xs text-gray-500">{formatTime(flight.arrival.time)}</div>
            </div>
          </div>
        </div>

        {/* Return Flight */}
        {hasReturn && (
          <div className="pt-3 border-t border-gray-100">
            <div className="flex justify-between items-center mb-2">
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Return</span>
              <span className="text-xs font-medium text-gray-700">{formatDate(flight.return.departure.time)}</span>
            </div>
            
            <div className="flex items-center gap-3">
              <div className="text-center min-w-[70px]">
                <div className="text-base font-bold text-gray-900">{flight.return.departure.airport}</div>
                <div className="text-xs text-gray-500">{formatTime(flight.return.departure.time)}</div>
              </div>
              
              <div className="flex-1 flex flex-col items-center gap-1">
                <div className="text-xs font-medium text-gray-500">{calculateDuration(flight.return.departure.time, flight.return.arrival.time)}</div>
                <div className="w-full h-0.5 bg-gray-200 relative">
                  <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-[6px] border-l-gray-200 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent"></div>
                </div>
                <div className="text-xs text-gray-500">{flight.return.stops === 0 ? 'Direct' : `${flight.return.stops} stop${flight.return.stops > 1 ? 's' : ''}`}</div>
              </div>
              
              <div className="text-center min-w-[70px]">
                <div className="text-base font-bold text-gray-900">{flight.return.arrival.airport}</div>
                <div className="text-xs text-gray-500">{formatTime(flight.return.arrival.time)}</div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="p-3 border-t border-gray-100 text-right">
        <button
          onClick={handleSaveFlight}
          disabled={saving}
          className={`font-semibold py-2 px-5 rounded-lg transition-all flex items-center justify-center gap-2 ml-auto text-sm ${
            saved
              ? 'bg-green-600 hover:bg-green-700 text-white'
              : 'bg-purple-700 hover:bg-purple-600 text-white'
          } disabled:opacity-50 disabled:cursor-not-allowed`}
        >
          {saving ? (
            <>
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              {saved ? 'Removing...' : 'Saving...'}
            </>
          ) : saved ? (
            <>
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                <path d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Saved
            </>
          ) : (
            <>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
              </svg>
              Save Flight
            </>
          )}
        </button>
      </div>
    </div>
  );
}


// import { useState } from 'react';
// import { db } from '../firebase';
// import { collection, addDoc, query, where, getDocs, deleteDoc, doc } from 'firebase/firestore';
// import { useAuth } from '../AuthContext';

// export default function FlightCard({ flight, index, searchParams, showToast }) {
//   const { currentUser } = useAuth();
//   const [saving, setSaving] = useState(false);
//   const [saved, setSaved] = useState(false);

//   const formatTime = (dateString) => {
//     return new Date(dateString).toLocaleTimeString('en-US', {
//       hour: '2-digit',
//       minute: '2-digit',
//       hour12: false
//     });
//   };

//   const formatDate = (dateString) => {
//     return new Date(dateString).toLocaleDateString('en-US', {
//       weekday: 'short',
//       month: 'short',
//       day: 'numeric'
//     });
//   };

//   const calculateDuration = (departure, arrival) => {
//     const dep = new Date(departure);
//     const arr = new Date(arrival);
//     const diffMs = arr - dep;
//     const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
//     const diffMinutes = Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60));
//     return `${diffHours}h ${diffMinutes}m`;
//   };

//   const hasReturn = flight.return && typeof flight.return === 'object';

//   const handleSaveFlight = async () => {
//     if (!currentUser) {
//       showToast('Please log in to save flights', 'error');
//       return;
//     }

//     setSaving(true);

//     try {
//       // Check if flight is already saved
//       const q = query(
//         collection(db, 'flightSavings'),
//         where('userId', '==', currentUser.uid),
//         where('flightId', '==', `${flight.airline}-${flight.departure.airport}-${flight.arrival.airport}-${flight.departure.time}`)
//       );

//       const querySnapshot = await getDocs(q);

//       if (!querySnapshot.empty) {
//         // Flight already saved, remove it (unsave)
//         const docToDelete = querySnapshot.docs[0];
//         await deleteDoc(doc(db, 'flightSavings', docToDelete.id));
//         setSaved(false);
//         showToast('Flight removed from saved flights', 'info');
//       } else {
//         // Save the flight
//         const flightData = {
//           userId: currentUser.uid,
//           userEmail: currentUser.email,
//           flightId: `${flight.airline}-${flight.departure.airport}-${flight.arrival.airport}-${flight.departure.time}`,
          
//           // Flight details
//           airline: flight.airline,
//           price: flight.price,
//           currency: flight.currency,
//           stops: flight.stops,
          
//           // Departure details
//           departureAirport: flight.departure.airport,
//           departureTime: flight.departure.time,
          
//           // Arrival details
//           arrivalAirport: flight.arrival.airport,
//           arrivalTime: flight.arrival.time,
          
//           // Return flight details (if exists)
//           hasReturn: hasReturn,
//           returnDepartureAirport: hasReturn ? flight.return.departure.airport : null,
//           returnDepartureTime: hasReturn ? flight.return.departure.time : null,
//           returnArrivalAirport: hasReturn ? flight.return.arrival.airport : null,
//           returnArrivalTime: hasReturn ? flight.return.arrival.time : null,
//           returnStops: hasReturn ? flight.return.stops : null,
          
//           // Search parameters
//           origin: searchParams?.origin || flight.departure.airport,
//           destination: searchParams?.destination || flight.arrival.airport,
//           originLabel: searchParams?.originLabel || flight.departure.airport,
//           destinationLabel: searchParams?.destinationLabel || flight.arrival.airport,
//           departureDate: searchParams?.departureDate || new Date(flight.departure.time).toISOString().split('T')[0],
//           returnDate: searchParams?.returnDate || null,
//           adults: searchParams?.adults || 1,
//           travelClass: searchParams?.travelClass || 'economy',
//           tripType: searchParams?.tripType || (hasReturn ? 'roundtrip' : 'oneway'),
          
//           // Metadata
//           savedAt: Date.now(),
//           timestamp: new Date().toISOString()
//         };

//         await addDoc(collection(db, 'flightSavings'), flightData);
//         setSaved(true);
//         showToast('Flight saved successfully!', 'success');
//       }
//     } catch (error) {
//       console.error('Error saving flight:', error);
//       showToast('Failed to save flight. Please try again.', 'error');
//     } finally {
//       setSaving(false);
//     }
//   };

//   return (
//     <div 
//       className="bg-white border border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-lg transition-all hover:-translate-y-1 opacity-0 animate-fadeIn"
//       style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'forwards' }}
//     >
//       {/* Header - Reduced padding from p-5 to p-3, gap from gap-4 to gap-2 */}
//       <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center p-3 border-b border-gray-100 gap-2">
//         <div className="flex items-center gap-3">
//           <div>
//             <div className="text-base font-semibold text-gray-900">{flight.airline}</div>
//             <div className={`text-xs font-semibold px-2 py-0.5 rounded-full inline-block ${
//               hasReturn ? 'bg-blue-50 text-blue-700' : 'bg-yellow-50 text-yellow-700'
//             }`}>
//               {hasReturn ? 'ROUND TRIP' : 'ONE WAY'}
//             </div>
//           </div>
//         </div>
//         <div className="text-right">
//           <div className="text-xl font-bold text-green-600">
//             {flight.currency} {flight.price}
//           </div>
//           <div className="text-xs text-gray-500">Total for all passengers</div>
//         </div>
//       </div>

//       {/* Flight Segments - Reduced padding from p-5 to p-3, space-y from 5 to 3 */}
//       <div className="p-3 space-y-3">
//         {/* Outbound Flight */}
//         <div>
//           {hasReturn && (
//             <div className="flex justify-between items-center mb-2">
//               <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Outbound</span>
//               <span className="text-xs font-medium text-gray-700">{formatDate(flight.departure.time)}</span>
//             </div>
//           )}
          
//           <div className="flex items-center gap-3">
//             <div className="text-center min-w-[70px]">
//               <div className="text-base font-bold text-gray-900">{flight.departure.airport}</div>
//               <div className="text-xs text-gray-500">{formatTime(flight.departure.time)}</div>
//             </div>
            
//             <div className="flex-1 flex flex-col items-center gap-1">
//               <div className="text-xs font-medium text-gray-500">{calculateDuration(flight.departure.time, flight.arrival.time)}</div>
//               <div className="w-full h-0.5 bg-gray-200 relative">
//                 <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-[6px] border-l-gray-200 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent"></div>
//               </div>
//               <div className="text-xs text-gray-500">{flight.stops === 0 ? 'Direct' : `${flight.stops} stop${flight.stops > 1 ? 's' : ''}`}</div>
//             </div>
            
//             <div className="text-center min-w-[70px]">
//               <div className="text-base font-bold text-gray-900">{flight.arrival.airport}</div>
//               <div className="text-xs text-gray-500">{formatTime(flight.arrival.time)}</div>
//             </div>
//           </div>
//         </div>

//         {/* Return Flight - Reduced pt from 5 to 3 */}
//         {hasReturn && (
//           <div className="pt-3 border-t border-gray-100">
//             <div className="flex justify-between items-center mb-2">
//               <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Return</span>
//               <span className="text-xs font-medium text-gray-700">{formatDate(flight.return.departure.time)}</span>
//             </div>
            
//             <div className="flex items-center gap-3">
//               <div className="text-center min-w-[70px]">
//                 <div className="text-base font-bold text-gray-900">{flight.return.departure.airport}</div>
//                 <div className="text-xs text-gray-500">{formatTime(flight.return.departure.time)}</div>
//               </div>
              
//               <div className="flex-1 flex flex-col items-center gap-1">
//                 <div className="text-xs font-medium text-gray-500">{calculateDuration(flight.return.departure.time, flight.return.arrival.time)}</div>
//                 <div className="w-full h-0.5 bg-gray-200 relative">
//                   <div className="absolute right-0 top-1/2 -translate-y-1/2 w-0 h-0 border-l-[6px] border-l-gray-200 border-t-[5px] border-t-transparent border-b-[5px] border-b-transparent"></div>
//                 </div>
//                 <div className="text-xs text-gray-500">{flight.return.stops === 0 ? 'Direct' : `${flight.return.stops} stop${flight.return.stops > 1 ? 's' : ''}`}</div>
//               </div>
              
//               <div className="text-center min-w-[70px]">
//                 <div className="text-base font-bold text-gray-900">{flight.return.arrival.airport}</div>
//                 <div className="text-xs text-gray-500">{formatTime(flight.return.arrival.time)}</div>
//               </div>
//             </div>
//           </div>
//         )}
//       </div>

//       {/* Footer - Reduced padding from p-5 to p-3, button py from 3 to 2 */}
//       <div className="p-3 border-t border-gray-100 text-right">
//         <button
//           onClick={handleSaveFlight}
//           disabled={saving}
//           className={`font-semibold py-2 px-5 rounded-lg transition-all flex items-center justify-center gap-2 ml-auto text-sm ${
//             saved
//               ? 'bg-green-600 hover:bg-green-700 text-white'
//               : 'bg-purple-700 hover:bg-purple-600 text-white'
//           } disabled:opacity-50 disabled:cursor-not-allowed`}
//         >
//           {saving ? (
//             <>
//               <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
//               Saving...
//             </>
//           ) : saved ? (
//             <>
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
//               </svg>
//               Saved
//             </>
//           ) : (
//             <>
//               <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
//                 <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
//               </svg>
//               Save Flight
//             </>
//           )}
//         </button>
//       </div>
//     </div>
//   );
// }


