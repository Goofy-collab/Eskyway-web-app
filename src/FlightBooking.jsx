import { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import FlightSearchForm from './components/FlightSearchForm';
import LoadingIndicator from './components/LoadingIndicator';
import FlightResults from './components/FlightResults';
import { searchFlights } from './services/flightService';
import { useToast } from './components/Toast';

export default function FlightBooking() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [view, setView] = useState('search');
  const [flights, setFlights] = useState([]);
  const [flightSearchParams, setFlightSearchParams] = useState(null);
  const [error, setError] = useState(null);

  // Initialize toast
  const { showToast, ToastContainer } = useToast();

  // Sync view with URL params - FIXED VERSION
  useEffect(() => {
    const viewParam = searchParams.get('view');
    if (viewParam === 'results') {
      setView('results');
    } else if (viewParam === 'loading') {
      setView('loading');
    } else {
      setView('search');
    }
  }, [searchParams]);

  const handleSearch = async (params) => {
    setSearchParams({ view: 'loading' });
    setView('loading');
    setFlightSearchParams(params);
    setError(null);

    try {
      const data = await searchFlights(params);
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // Check if data is empty
      if (!data || data.length === 0) {
        console.log('No flights returned from API');
        setFlights([]);
        setError(null); // Important: Don't treat as error
      } else {
        console.log(`Found ${data.length} flights`);
        setFlights(data);
        setError(null);
      }
      
      setSearchParams({ view: 'results' });
      setView('results');
      
    } catch (err) {
      console.error('Error fetching flights:', err);
      setFlights([]);
      setError(err.message || 'Failed to search flights. Please try again.');
      setSearchParams({ view: 'results' });
      setView('results');
    }
  };

  const handleModifySearch = () => {
    setSearchParams({});
    setView('search');
    setFlights([]);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
      <style>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-fadeIn {
          animation: fadeIn 0.5s ease-out;
        }
      `}</style>

      {/* Toast Container */}
      <ToastContainer />
      
      <div className="max-w-7xl mx-auto">
        {view === 'search' && <FlightSearchForm onSearch={handleSearch} />}
        {view === 'loading' && <LoadingIndicator searchParams={flightSearchParams} />}
        {view === 'results' && (
          <FlightResults
            flights={flights}
            searchParams={flightSearchParams}
            error={error}
            onModifySearch={handleModifySearch}
            onRetry={() => handleSearch(flightSearchParams)}
            showToast={showToast}
          />
        )}
      </div>
    </div>
  );
}





// import { useState, useEffect } from 'react';
// import { useSearchParams } from 'react-router-dom';
// import FlightSearchForm from './components/FlightSearchForm';
// import LoadingIndicator from './components/LoadingIndicator';
// import FlightResults from './components/FlightResults';
// import { searchFlights } from './services/flightService';
// import { useToast } from './components/Toast';

// export default function FlightBooking() {
//   const [searchParams, setSearchParams] = useSearchParams();
//   const [view, setView] = useState('search');
//   const [flights, setFlights] = useState([]);
//   const [flightSearchParams, setFlightSearchParams] = useState(null);
//   const [error, setError] = useState(null);

//   // Initialize toast
//   const { showToast, ToastContainer } = useToast();

//   // Sync view with URL params
//   useEffect(() => {
//     const viewParam = searchParams.get('view');
//     if (viewParam === 'results' && flights.length > 0) {
//       setView('results');
//     } else if (viewParam === 'loading') {
//       setView('loading');
//     } else {
//       setView('search');
//     }
//   }, [searchParams, flights.length]);

//   const handleSearch = async (params) => {
//     setSearchParams({ view: 'loading' });
//     setView('loading');
//     setFlightSearchParams(params);
//     setError(null);

//     try {
//       const data = await searchFlights(params);
//       await new Promise(resolve => setTimeout(resolve, 500));
//       setFlights(data);
//       setSearchParams({ view: 'results' });
//       setView('results');
//     } catch (err) {
//       console.error('Error fetching flights:', err);
//       setError(err.message);
//       setSearchParams({ view: 'results' });
//       setView('results');
//     }
//   };

//   const handleModifySearch = () => {
//     setSearchParams({});
//     setView('search');
//   };

//   return (
//     <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 p-4 md:p-8">
//       <style>{`
//         @keyframes fadeIn {
//           from {
//             opacity: 0;
//             transform: translateY(20px);
//           }
//           to {
//             opacity: 1;
//             transform: translateY(0);
//           }
//         }
//         .animate-fadeIn {
//           animation: fadeIn 0.5s ease-out;
//         }
//       `}</style>

//       {/* Toast Container */}
//       <ToastContainer />
      
//       <div className="max-w-7xl mx-auto">
//         {view === 'search' && <FlightSearchForm onSearch={handleSearch} />}
//         {view === 'loading' && <LoadingIndicator searchParams={flightSearchParams} />}
//         {view === 'results' && (
//           <FlightResults
//             flights={flights}
//             searchParams={flightSearchParams}
//             error={error}
//             onModifySearch={handleModifySearch}
//             onRetry={() => handleSearch(flightSearchParams)}
//             showToast={showToast}
//           />
//         )}
//       </div>
//     </div>
//   );
// }


