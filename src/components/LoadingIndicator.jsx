export default function LoadingIndicator({ searchParams }) {
  return (
    <div className="flex flex-col items-center justify-center p-12 md:p-16 text-center bg-white rounded-2xl shadow-lg">
      <div className="w-10 h-10 border-4 border-gray-200 border-t-purple-700 rounded-full animate-spin mb-5"></div>
      
      <h3 className="text-xl font-bold text-gray-900 mb-2">
        Searching for flights...
      </h3>
      <p className="text-gray-600 text-sm md:text-base max-w-md leading-relaxed">
        We're finding the best flight options from <strong>{searchParams?.origin}</strong> to{' '}
        <strong>{searchParams?.destination}</strong>
        {searchParams?.returnDate ? ' for your round-trip journey' : ' for your trip'}
      </p>
      
      <div className="flex flex-wrap gap-4 mt-8 justify-center">
        <div className="flex items-center gap-2 px-3 py-2 bg-blue-50 rounded-full text-xs font-medium text-blue-700">
          <div className="w-2 h-2 bg-blue-700 rounded-full animate-pulse"></div>
          Connecting to airlines
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          Comparing prices
        </div>
        <div className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-full text-xs font-medium text-gray-600">
          <div className="w-2 h-2 bg-gray-400 rounded-full"></div>
          Preparing results
        </div>
      </div>
    </div>
  );
}


