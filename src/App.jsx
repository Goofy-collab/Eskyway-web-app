import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { LoadScript } from '@react-google-maps/api';
import { AuthProvider, useAuth } from './AuthContext';
import AuthScreen from './AuthScreen';
import RideInputForm from './RideInputForm';
import FlightBooking from './FlightBooking';
import Navigation from './components/Navigation';
import RideCompletionListener from './RideCompletionListener';
import { useToast } from './components/Toast'; 
//import TrackingScreen from './TrackingScreen';

const libraries = ["places"];

function ProtectedRoute({ children }) {
  const { currentUser, loading } = useAuth();
  
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="text-lg text-gray-600 font-medium">Loading...</div>
      </div>
    );
  }
  
  return currentUser ? children : <Navigate to="/auth" />;
}

function AppContent() {
  const { currentUser, loading } = useAuth();
  const { showToast, ToastContainer } = useToast();  
  
  if (loading) {
    return (
      <div className="h-screen flex flex-col items-center justify-center bg-gray-50 gap-4">
        <div className="text-lg text-gray-600 font-medium">Loading...</div>
      </div>
    );
  }
  
  return (
    <BrowserRouter>
      {/* Toast Container - Global */}
      <ToastContainer />
      
      {currentUser && <Navigation />}
      
      {/* RIDE COMPLETION LISTENER - ALWAYS ACTIVE WHEN LOGGED IN */}
      {currentUser && <RideCompletionListener showToast={showToast} />}
      
      <Routes>
        <Route
          path="/auth"
          element={currentUser ? <Navigate to="/flights" /> : <AuthScreen />}
        />
        
        <Route
          path="/flights"
          element={
            <ProtectedRoute>
              <FlightBooking />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/rides"
          element={
            <ProtectedRoute>
              <RideInputForm showToast={showToast} />
            </ProtectedRoute>
          }
        />
        
        <Route
          path="/"
          element={<Navigate to={currentUser ? "/flights" : "/auth"} />}
        />
        
        <Route path="*" element={<Navigate to="/" />} />

        {/* <Route
  path="/tracking/:rideId"
  element={
    <ProtectedRoute>
      <TrackingScreen showToast={showToast} />
    </ProtectedRoute>
  }
/> */}
      </Routes>
    </BrowserRouter>
  );
}

function App() {
  return (
    <AuthProvider>
      <LoadScript
        googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
        libraries={libraries}
        loadingElement={
          <div className="h-screen flex items-center justify-center">
            <div className="text-lg text-gray-600">Loading Maps...</div>
          </div>
        }
      >
        <AppContent />
      </LoadScript>
    </AuthProvider>
  );
}

export default App;


