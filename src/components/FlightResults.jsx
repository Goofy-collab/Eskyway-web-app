import { useState, useEffect } from 'react';
import FlightCard from './FlightCard';
import FlightFilters from './FlightFilters';

export default function FlightResults({ flights, searchParams, onModifySearch, error, onRetry, showToast }) {
  const [currentPage, setCurrentPage] = useState(1);
  const [filteredFlights, setFilteredFlights] = useState(flights);
  const resultsPerPage = 7;

  // Update filtered flights when original flights change
  useEffect(() => {
    setFilteredFlights(flights);
    setCurrentPage(1);
  }, [flights]);

  // Calculate pagination based on filtered flights
  const totalPages = Math.ceil(filteredFlights.length / resultsPerPage);
  const startIndex = (currentPage - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const currentFlights = filteredFlights.slice(startIndex, endIndex);

  // Handle filter changes
  const handleFilterChange = (filtered) => {
    setFilteredFlights(filtered);
    setCurrentPage(1); // Reset to first page when filters change
  };

  // Handle page changes
  const goToPage = (pageNumber) => {
    setCurrentPage(pageNumber);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const goToNextPage = () => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  };

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = [];
    const maxPagesToShow = 5;

    if (totalPages <= maxPagesToShow) {
      for (let i = 1; i <= totalPages; i++) {
        pages.push(i);
      }
    } else {
      let startPage = Math.max(1, currentPage - 2);
      let endPage = Math.min(totalPages, currentPage + 2);

      if (currentPage <= 3) {
        endPage = maxPagesToShow;
      } else if (currentPage >= totalPages - 2) {
        startPage = totalPages - maxPagesToShow + 1;
      }

      if (startPage > 1) {
        pages.push(1);
        if (startPage > 2) pages.push('...');
      }

      for (let i = startPage; i <= endPage; i++) {
        pages.push(i);
      }

      if (endPage < totalPages) {
        if (endPage < totalPages - 1) pages.push('...');
        pages.push(totalPages);
      }
    }

    return pages;
  };

  return (
    <div className="space-y-4">
      {/* Header Section - Full Width at Top */}
      <div className="bg-white rounded-2xl shadow-lg p-6 text-center">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">Available Flights</h1>
        <p className="text-base text-gray-600">
          Flights from <strong className="text-gray-900">{searchParams?.originLabel}</strong> to{' '}
          <strong className="text-gray-900">{searchParams?.destinationLabel}</strong>
        </p>
        {flights.length > 0 && (
          <p className="text-sm font-medium text-gray-600 mt-2">
            Found {flights.length} flight{flights.length !== 1 ? 's' : ''} • 
            Showing {startIndex + 1}-{Math.min(endIndex, filteredFlights.length)} of {filteredFlights.length} results
          </p>
        )}
      </div>

      {/* Content Section with Sidebar and Results */}
      <div className="flex gap-6">
        {/* Left Sidebar - Filters (only show when there are flights) */}
        {!error && flights.length > 0 && (
          <aside className="w-80 flex-shrink-0">
            <FlightFilters 
              flights={flights}
              onFilterChange={handleFilterChange}
              currency={flights[0]?.currency || 'USD'}
            />
          </aside>
        )}

        {/* Right Content - Results */}
        <div className={`space-y-6 ${!error && flights.length > 0 ? 'flex-1' : 'w-full'}`}>

          {/* Error State */}
          {error && (
            <div className="bg-white rounded-2xl shadow-lg p-8 text-center border-l-4 border-red-500">
              <h3 className="text-xl font-bold text-red-700 mb-3">Failed to fetch flights</h3>
              <p className="text-base text-gray-600 mb-6">{error}</p>
              <div className="flex gap-3 justify-center">
                <button
                  onClick={onRetry}
                  className="bg-red-500 hover:bg-red-600 text-white text-base font-semibold py-3 px-8 rounded-lg transition-colors"
                >
                  Try Again
                </button>
                <button
                  onClick={onModifySearch}
                  className="bg-gray-500 hover:bg-gray-600 text-white text-base font-semibold py-3 px-8 rounded-lg transition-colors"
                >
                  Back to Search
                </button>
              </div>
            </div>
          )}

          {/* No Flights State */}
          {!error && flights.length === 0 && (
  <div className="bg-white rounded-2xl shadow-lg p-8 text-center border-l-4 border-amber-500">
   
    
    <h3 className="text-base font-semibold text-gray-900 mb-3">
      No {searchParams?.travelClass === 'economy' ? 'Economy' : 
          searchParams?.travelClass === 'business' ? 'Business' : 
          searchParams?.travelClass === 'first' ? 'First' : ''} Class Flights Available
    </h3>
    
    <p className="text-base font-semibold text-gray-900 mb-3">
      Unfortunately, there are no{' '}
      <strong className="text-gray-900 capitalize">
        {searchParams?.travelClass}
      </strong>{' '}
      class seats available for flights from{' '}
      <strong className="text-gray-900">{searchParams?.originLabel}</strong> to{' '}
      <strong className="text-gray-900">{searchParams?.destinationLabel}</strong>
      {searchParams?.departureDate && (
        <> on <strong className="text-gray-900">{searchParams.departureDate}</strong></>
      )}.
    </p>
    
    {/* <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6 mb-6 max-w-lg mx-auto">
      <p className="text-base text-blue-800 font-semibold mb-3">💡 Try these alternatives:</p>
      <ul className="text-base text-blue-700 text-left space-y-2">
        <li>✓ Select <strong>Economy</strong> class for more options</li>
        <li>✓ Choose different travel dates</li>
        <li>✓ Check nearby airports</li>
        {searchParams?.returnDate && <li>✓ Try a one-way search instead</li>}
      </ul>
    </div> */}
    
    {/* <div className="flex gap-4 justify-center flex-wrap mt-6">
      <button
        onClick={onModifySearch}
        className="bg-purple-600 hover:bg-purple-700 text-white text-base font-semibold py-3 px-8 rounded-lg transition-all shadow-md hover:shadow-lg"
      >
        ← Modify Search
      </button>
      
      {searchParams?.travelClass !== 'economy' && onRetry && (
        <button
          onClick={() => {
            const newParams = { 
              ...searchParams, 
              travelClass: 'economy' 
            };
            onRetry(newParams);
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white text-base font-semibold py-3 px-8 rounded-lg transition-all shadow-md hover:shadow-lg"
        >
          Try Economy Class
        </button>
      )}
    </div> */}
  </div>
)}

          {/* Flight Cards */}
          {!error && flights.length > 0 && (
            <>
              <div className="space-y-4">
                {currentFlights.map((flight, index) => (
                  <FlightCard
                    key={startIndex + index}
                    flight={flight}
                    index={startIndex + index}
                    searchParams={searchParams}
                    showToast={showToast}
                  />
                ))}
              </div>

              {/* No Filtered Results */}
              {filteredFlights.length === 0 && (
                <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
                  <h3 className="text-xl font-bold text-gray-900 mb-3">No flights match your filters</h3>
                  <p className="text-base text-gray-600">Try adjusting your filter criteria.</p>
                </div>
              )}

              {/* Pagination Controls */}
              {totalPages > 1 && (
                <div className="bg-white rounded-2xl shadow-lg p-6">
                  <div className="flex flex-wrap items-center justify-center gap-2">
                    {/* Previous Button */}
                    <button
                      onClick={goToPreviousPage}
                      disabled={currentPage === 1}
                      className={`px-5 py-2.5 text-base rounded-lg font-semibold transition-all ${
                        currentPage === 1
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200 hover:shadow-md'
                      }`}
                    >
                      ← Previous
                    </button>

                    {/* Page Numbers */}
                    {getPageNumbers().map((page, index) => (
                      <button
                        key={index}
                        onClick={() => typeof page === 'number' && goToPage(page)}
                        disabled={page === '...'}
                        className={`px-4 py-2.5 text-base rounded-lg font-semibold transition-all min-w-[45px] ${
                          page === currentPage
                            ? 'bg-purple-700 text-white shadow-lg scale-110'
                            : page === '...'
                            ? 'cursor-default text-gray-400 bg-transparent'
                            : 'bg-gray-100 text-gray-700 hover:bg-purple-50 hover:text-purple-700 hover:shadow-md'
                        }`}
                      >
                        {page}
                      </button>
                    ))}

                    {/* Next Button */}
                    <button
                      onClick={goToNextPage}
                      disabled={currentPage === totalPages}
                      className={`px-5 py-2.5 text-base rounded-lg font-semibold transition-all ${
                        currentPage === totalPages
                          ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
                          : 'bg-purple-100 text-purple-700 hover:bg-purple-200 hover:shadow-md'
                      }`}
                    >
                      Next →
                    </button>
                  </div>

                  {/* Page Info */}
                  <p className="text-center text-base font-medium text-gray-600 mt-4">
                    Page {currentPage} of {totalPages}
                  </p>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}








// import { useState, useEffect } from 'react';
// import FlightCard from './FlightCard';
// import FlightFilters from './FlightFilters';
// import { Search } from 'lucide-react';

// export default function FlightResults({ flights, searchParams, onModifySearch, error, onRetry, showToast }) {
//   const [currentPage, setCurrentPage] = useState(1);
//   const [filteredFlights, setFilteredFlights] = useState(flights);
//   const resultsPerPage = 7;

//   // Update filtered flights when original flights change
//   useEffect(() => {
//     setFilteredFlights(flights);
//     setCurrentPage(1);
//   }, [flights]);

//   // Calculate pagination based on filtered flights
//   const totalPages = Math.ceil(filteredFlights.length / resultsPerPage);
//   const startIndex = (currentPage - 1) * resultsPerPage;
//   const endIndex = startIndex + resultsPerPage;
//   const currentFlights = filteredFlights.slice(startIndex, endIndex);

//   // Handle filter changes
//   const handleFilterChange = (filtered) => {
//     setFilteredFlights(filtered);
//     setCurrentPage(1); // Reset to first page when filters change
//   };

//   // Handle page changes
//   const goToPage = (pageNumber) => {
//     setCurrentPage(pageNumber);
//     window.scrollTo({ top: 0, behavior: 'smooth' });
//   };

//   const goToNextPage = () => {
//     if (currentPage < totalPages) {
//       goToPage(currentPage + 1);
//     }
//   };

//   const goToPreviousPage = () => {
//     if (currentPage > 1) {
//       goToPage(currentPage - 1);
//     }
//   };

//   // Generate page numbers to display
//   const getPageNumbers = () => {
//     const pages = [];
//     const maxPagesToShow = 5;

//     if (totalPages <= maxPagesToShow) {
//       for (let i = 1; i <= totalPages; i++) {
//         pages.push(i);
//       }
//     } else {
//       let startPage = Math.max(1, currentPage - 2);
//       let endPage = Math.min(totalPages, currentPage + 2);

//       if (currentPage <= 3) {
//         endPage = maxPagesToShow;
//       } else if (currentPage >= totalPages - 2) {
//         startPage = totalPages - maxPagesToShow + 1;
//       }

//       if (startPage > 1) {
//         pages.push(1);
//         if (startPage > 2) pages.push('...');
//       }

//       for (let i = startPage; i <= endPage; i++) {
//         pages.push(i);
//       }

//       if (endPage < totalPages) {
//         if (endPage < totalPages - 1) pages.push('...');
//         pages.push(totalPages);
//       }
//     }

//     return pages;
//   };

//   return (
//     <div className="space-y-4">
//       {/* Header Section - Full Width at Top */}
//       <div className="bg-white rounded-2xl shadow-lg p-4 text-center">
//         <h1 className="text-2xl md:text-3xl font-bold text-gray-900 mb-1">Available Flights</h1>
//         <p className="text-gray-600 text-xs md:text-sm">
//           Flights from <strong>{searchParams?.originLabel}</strong> to{' '}
//           <strong>{searchParams?.destinationLabel}</strong>
//         </p>
//         {flights.length > 0 && (
//           <p className="text-xs font-medium text-gray-600 mt-1">
//             Found {flights.length} flight{flights.length !== 1 ? 's' : ''} • 
//             Showing {startIndex + 1}-{Math.min(endIndex, filteredFlights.length)} of {filteredFlights.length} results
//           </p>
//         )}
//       </div>

//       {/* Content Section with Sidebar and Results */}
//       <div className="flex gap-6">
//         {/* Left Sidebar - Filters (only show when there are flights) */}
//         {!error && flights.length > 0 && (
//           <aside className="w-80 flex-shrink-0">
//             <FlightFilters 
//               flights={flights}
//               onFilterChange={handleFilterChange}
//               currency={flights[0]?.currency || 'USD'}
//             />
//           </aside>
//         )}

//         {/* Right Content - Results */}
//         <div className={`space-y-6 ${!error && flights.length > 0 ? 'flex-1' : 'w-full'}`}>

//         {error && (
//           <div className="bg-white rounded-2xl shadow-lg p-8 text-center border-l-4 border-red-500">
//             <h3 className="text-xl font-bold text-red-700 mb-2">Failed to fetch flights</h3>
//             <p className="text-gray-600 text-sm md:text-base mb-4">{error}</p>
//             <div className="flex gap-3 justify-center">
//               <button
//                 onClick={onRetry}
//                 className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
//               >
//                 Try Again
//               </button>
//               <button
//                 onClick={onModifySearch}
//                 className="bg-gray-500 hover:bg-gray-600 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
//               >
//                  Back to Search
//               </button>
//             </div>
//           </div>
//         )}

//         {!error && flights.length === 0 && (
//           <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
//             <h3 className="text-xl font-bold text-gray-900 mb-2">No flights found</h3>
//             <p className="text-gray-600 text-sm md:text-base mb-4">Try adjusting your search criteria or dates.</p>
//             <button
//               onClick={onModifySearch}
//               className="bg-purple-600 hover:bg-purple-700 text-white font-semibold py-2 px-6 rounded-lg transition-colors"
//             >
//               ← Modify Search
//             </button>
//           </div>
//         )}

//         {!error && flights.length > 0 && (
//           <>
//             {/* Flight Cards */}
//             <div className="space-y-4">
//               {currentFlights.map((flight, index) => (
//                 <FlightCard
//                   key={startIndex + index}
//                   flight={flight}
//                   index={startIndex + index}
//                   searchParams={searchParams}
//                   showToast={showToast}
//                 />
//               ))}
//             </div>

//             {filteredFlights.length === 0 && (
//               <div className="bg-white rounded-2xl shadow-lg p-8 text-center">
//                 <h3 className="text-xl font-bold text-gray-900 mb-2">No flights match your filters</h3>
//                 <p className="text-gray-600 text-sm md:text-base mb-4">Try adjusting your filter criteria.</p>
//               </div>
//             )}

//             {/* Pagination Controls */}
//             {totalPages > 1 && (
//               <div className="bg-white rounded-2xl shadow-lg p-6">
//                 <div className="flex flex-wrap items-center justify-center gap-2">
//                   {/* Previous Button */}
//                   <button
//                     onClick={goToPreviousPage}
//                     disabled={currentPage === 1}
//                     className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${
//                       currentPage === 1
//                         ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
//                         : 'bg-purple-100 text-purple-700 hover:bg-purple-200 hover:shadow-md'
//                     }`}
//                   >
//                     ← Previous
//                   </button>

//                   {/* Page Numbers */}
//                   {getPageNumbers().map((page, index) => (
//                     <button
//                       key={index}
//                       onClick={() => typeof page === 'number' && goToPage(page)}
//                       disabled={page === '...'}
//                       className={`px-4 py-2.5 rounded-lg font-semibold transition-all min-w-[45px] ${
//                         page === currentPage
//                           ? 'bg-purple-700 text-white shadow-lg scale-110'
//                           : page === '...'
//                           ? 'cursor-default text-gray-400 bg-transparent'
//                           : 'bg-gray-100 text-gray-700 hover:bg-purple-50 hover:text-purple-700 hover:shadow-md'
//                       }`}
//                     >
//                       {page}
//                     </button>
//                   ))}

//                   {/* Next Button */}
//                   <button
//                     onClick={goToNextPage}
//                     disabled={currentPage === totalPages}
//                     className={`px-5 py-2.5 rounded-lg font-semibold transition-all ${
//                       currentPage === totalPages
//                         ? 'bg-gray-200 text-gray-400 cursor-not-allowed'
//                         : 'bg-purple-100 text-purple-700 hover:bg-purple-200 hover:shadow-md'
//                     }`}
//                   >
//                     Next →
//                   </button>
//                 </div>

//                 {/* Page Info */}
//                 <p className="text-center text-sm font-medium text-gray-600 mt-4">
//                   Page {currentPage} of {totalPages}
//                 </p>
//               </div>
//             )}
//           </>
//         )}
//       </div>
//     </div>
//     </div>
//   );
// }





