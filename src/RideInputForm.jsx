import React, { useRef, useState, useCallback } from "react";
//import { LoadScript, Autocomplete, GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { Autocomplete, GoogleMap, Marker, DirectionsRenderer } from "@react-google-maps/api";
import { doc, setDoc, serverTimestamp, GeoPoint, onSnapshot, collection, query, where, getDocs } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
//import { db, auth } from './firebase';
import { db, auth, realtimeDb } from './firebase';
import { useAuth } from './AuthContext';
import { getDatabase, ref, onValue, off } from 'firebase/database';
import TrackingScreen from './TrackingScreen';
import { Car, Sparkles, Users, Smartphone, Banknote, CreditCard } from "lucide-react";
import { User, CheckCircle, Star, MapPin, Clock } from "lucide-react";
//import { useToast } from './components/Toast';



//const libraries = ["places"];

const defaultCenter = {
  lat: -1.2921, // Nairobi coordinates
  lng: 36.8219,
};

export default function RideInputForm() {
  const pickupAutocompleteRef = useRef(null);
  const destinationAutocompleteRef = useRef(null);
  
  const [pickupLocation, setPickupLocation] = useState(null);
  const [destinationLocation, setDestinationLocation] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [showBookingDialog, setShowBookingDialog] = useState(false);
const [currentStep, setCurrentStep] = useState(0);
const [selectedVehicle, setSelectedVehicle] = useState(null);
const [selectedPayment, setSelectedPayment] = useState(null);
  const [useCurrentLocation, setUseCurrentLocation] = useState(false);
  const [currentLocationLoading, setCurrentLocationLoading] = useState(false);
  const [pickupAddress, setPickupAddress] = useState("");
  const [destinationAddress, setDestinationAddress] = useState("");
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [routeInfo, setRouteInfo] = useState(null);
  const [loadingRoute, setLoadingRoute] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [showDriverSelection, setShowDriverSelection] = useState(false);
const [acceptedDrivers, setAcceptedDrivers] = useState([]);
const [selectedDriver, setSelectedDriver] = useState(null);
const [currentRideId, setCurrentRideId] = useState(null);
const [showTrackingScreen, setShowTrackingScreen] = useState(false);
const [showTrackingDialog, setShowTrackingDialog] = useState(false);
//const { showToast, ToastContainer } = useToast();

  const { currentUser } = useAuth();

  const handleLogout = async () => {
  try {
    console.log('Logging out...');
    
    // Clear all local states before signing out
    setShowBookingDialog(false);
    setShowDriverSelection(false);
    setPickupLocation(null);
    setDestinationLocation(null);
    setPickupAddress('');
    setDestinationAddress('');
    setSelectedVehicle(null);
    setSelectedPayment(null);
    setCurrentRideId(null);
    setAcceptedDrivers([]);
    setDirectionsResponse(null);
    setRouteInfo(null);
    
    // Sign out from Firebase
    await signOut(auth);
    console.log('Logged out successfully');
  } catch (error) {
    console.error('Error signing out:', error);
    alert('Failed to logout. Please try again.');
  }
};
//const auth = getAuth();

  const vehicleOptions = [
  {
    type: "Standard Car",
    capacity: "4 passengers",
    baseFare: 100.0,
    perKmRate: 30.0,
    icon: Car,
    color: "text-gray-700"
  },
  {
    type: "Premium Car",
    capacity: "4 passengers",
    baseFare: 150.0,
    perKmRate: 40.0,
    icon: Sparkles,
    color: "text-purple-700"

  },
  {
    type: "Van",
    capacity: "7 passengers",
    baseFare: 200.0,
    perKmRate: 45.0,
    icon: Users,
    color: "text-green-500"
  }
];

const paymentMethods = [
  { type: "M-Pesa", icon: Smartphone, color: "text-green-500" },
  { type: "Cash", icon: Banknote, color: "text-gray-700" },
  { type: "Credit Card", icon: CreditCard, color: "text-purple-700" }
];

// Firebase helper functions
const updatePassengerId = async (userId, passengerName) => {
  const rideRequestRef = doc(db, "rideRequests", userId);
  await setDoc(rideRequestRef, {
    id: userId,
    passengerId: userId,
    passengerName: passengerName
  }, { merge: true });
};

const updateUserLocation = async (userId, location, locationType, address) => {
  const rideRequestRef = doc(db, "rideRequests", userId);
  
  const updateData = {
    [`${locationType}Location`]: new GeoPoint(location.lat, location.lng),
    [`${locationType}Address`]: address,
    id: userId
  };

  await setDoc(rideRequestRef, updateData, { merge: true });
};

const updateUserVehiclePreference = async (userId, vehicle) => {
  const rideRequestRef = doc(db, "rideRequests", userId);
  
  await setDoc(rideRequestRef, {
    id: userId,
    vehiclePreference: {
      type: vehicle.type,
      baseFare: vehicle.baseFare,
      perKmRate: vehicle.perKmRate
    }
  }, { merge: true });
};

const updateUserPaymentMethod = async (userId, paymentType) => {
  const rideRequestRef = doc(db, "rideRequests", userId);
  
  await setDoc(rideRequestRef, {
    id: userId,
    paymentMethod: paymentType
  }, { merge: true });
};

const updateRidePrice = async (userId, totalPrice) => {
  const rideRequestRef = doc(db, "rideRequests", userId);
  
  await setDoc(rideRequestRef, {
    id: userId,
    ridePrice: totalPrice
  }, { merge: true });
};

const setRidePending = async (userId, userEmail, totalCost) => {
  const rideRequestRef = doc(db, "rideRequests", userId);
  
  await setDoc(rideRequestRef, {
    id: userId,
    status: "PENDING",
    price: totalCost,
    userEmail: userEmail,
    timestamp: serverTimestamp()
  }, { merge: true });
};

const calculateDistanceBetween = (lat1, lon1, lat2, lon2) => {
  const R = 6371; // Earth's radius in kilometers
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in km
};

  // Calculate route between pickup and destination
  const calculateRoute = useCallback(async (pickup, destination) => {
    if (!pickup || !destination) return;
    
    setLoadingRoute(true);
    try {
      const directionsService = new google.maps.DirectionsService();
      
      const results = await directionsService.route({
        origin: pickup,
        destination: destination,
        travelMode: google.maps.TravelMode.DRIVING,
      });

      setDirectionsResponse(results);
      
      // Extract route information
      const route = results.routes[0];
      if (route) {
        const leg = route.legs[0];
        setRouteInfo({
          distance: leg.distance.text,
          duration: leg.duration.text,
          distanceValue: leg.distance.value, // in meters
          durationValue: leg.duration.value  // in seconds
        });
      }
    } catch (error) {
      console.error("Error calculating route:", error);
      setDirectionsResponse(null);
      setRouteInfo(null);
    } finally {
      setLoadingRoute(false);
    }
  }, []);

  // Calculate straight-line distance as fallback
  const calculateStraightDistance = (pickup, destination) => {
    const R = 6371; // Earth's radius in kilometers
    const dLat = (destination.lat - pickup.lat) * Math.PI / 180;
    const dLon = (destination.lng - pickup.lng) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(pickup.lat * Math.PI / 180) * Math.cos(destination.lat * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c; // Distance in km
    return distance.toFixed(2);
  };

  // Reverse geocode to get address from coordinates
  const reverseGeocode = useCallback((lat, lng) => {
    const geocoder = new google.maps.Geocoder();
    geocoder.geocode({ location: { lat, lng } }, (results, status) => {
      if (status === 'OK') {
        if (results[0]) {
          setPickupAddress(results[0].formatted_address);
        } else {
          setPickupAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
        }
      } else {
        setPickupAddress(`${lat.toFixed(6)}, ${lng.toFixed(6)}`);
      }
    });
  }, []);

  const getCurrentLocation = useCallback(() => {
    setCurrentLocationLoading(true);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const currentPos = {
            lat: position.coords.latitude,
            lng: position.coords.longitude,
          };
          setPickupLocation(currentPos);
          setMapCenter(currentPos);
          setUseCurrentLocation(true);
          setCurrentLocationLoading(false);
          
          // Get the actual address for display
          reverseGeocode(currentPos.lat, currentPos.lng);
        },
        (error) => {
          console.error("Error getting location:", error);
          setCurrentLocationLoading(false);
          alert("Unable to get your current location. Please enter pickup location manually.");
        }
      );
    } else {
      setCurrentLocationLoading(false);
      alert("Geolocation is not supported by this browser.");
    }
  }, [reverseGeocode]);

  // Handle pickup location selection from autocomplete
  const handlePickupPlaceSelect = useCallback(() => {
    if (pickupAutocompleteRef.current) {
      const place = pickupAutocompleteRef.current.getPlace();
      
      if (place && place.geometry && place.geometry.location) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        setPickupLocation(location);
        setMapCenter(location);
        setUseCurrentLocation(false);
        setPickupAddress(place.formatted_address || place.name || "Selected Location");
        //console.log("Pickup location set:", location);
        
        // Calculate route if destination exists
        if (destinationLocation) {
          calculateRoute(location, destinationLocation);
        }
      }
    }
  }, [destinationLocation, calculateRoute]);

  // Handle destination location selection from autocomplete
  const handleDestinationPlaceSelect = useCallback(() => {
    if (destinationAutocompleteRef.current) {
      const place = destinationAutocompleteRef.current.getPlace();
      
      if (place && place.geometry && place.geometry.location) {
        const location = {
          lat: place.geometry.location.lat(),
          lng: place.geometry.location.lng(),
        };
        setDestinationLocation(location);
        setDestinationAddress(place.formatted_address || place.name || "Selected Location");
        
        // If we have both locations, center map between them and calculate route
        if (pickupLocation) {
          const centerLat = (pickupLocation.lat + location.lat) / 2;
          const centerLng = (pickupLocation.lng + location.lng) / 2;
          setMapCenter({ lat: centerLat, lng: centerLng });
          calculateRoute(pickupLocation, location);
        } else {
          setMapCenter(location);
        }
        //console.log("Destination location set:", location);
      }
    }
  }, [pickupLocation, calculateRoute]);

  const handleSubmit = (e) => {
  e.preventDefault();
  
  //console.log("Pickup Address:", pickupAddress);
  //console.log("Destination Address:", destinationAddress);
 // console.log("Pickup Coordinates:", pickupLocation);
  //console.log("Destination Coordinates:", destinationLocation);
  
  // Open the booking dialog
  setShowBookingDialog(true);
  setCurrentStep(0); // Reset to vehicle selection
};

  const handlePickupInputChange = (e) => {
    // If user starts typing, switch off current location mode
    if (useCurrentLocation) {
      setUseCurrentLocation(false);
    }
    setPickupAddress(e.target.value);
  };

  // Track Driver Dialog Component
const TrackingDialog = () => {
  if (!showTrackingDialog) return null;

  const handleTrackDriver = () => {
    setShowTrackingDialog(false);
    setShowTrackingScreen(true);
  };

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '400px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{
          fontSize: '24px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '16px'
        }}>
          Track Driver
        </h3>

        <p style={{
          fontSize: '16px',
          color: '#374151',
          marginBottom: '12px',
          lineHeight: '1.5'
        }}>
          Your driver is on the way!
        </p>

        <p style={{
          fontSize: '14px',
          color: '#6b7280',
          marginBottom: '24px',
          lineHeight: '1.5'
        }}>
          Track your driver's location in real-time and view their estimated time of arrival.
        </p>

        <div style={{ display: 'flex', gap: '12px' }}>
          <button
            onClick={() => setShowTrackingDialog(false)}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#f3f4f6',
              color: '#374151',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Later
          </button>

          <button
            onClick={handleTrackDriver}
            style={{
              flex: 1,
              padding: '12px',
              backgroundColor: '#7c3aed',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontSize: '14px',
              fontWeight: '600',
              cursor: 'pointer'
            }}
          >
            Track Your Driver
          </button>
        </div>
      </div>
    </div>
  );
};

    
    // Driver Selection Dialog Component
const DriverSelectionDialog = () => {
  React.useEffect(() => {
    if (!showDriverSelection || !currentRideId) {
      return;
    }

    //console.log('Setting up driver listener for ride:', currentRideId);

    const unsubscribe = onSnapshot(
      doc(db, "rideRequests", currentRideId),
      async (snapshot) => {
        if (snapshot.exists()) {
          const data = snapshot.data();
         // console.log('Ride status:', data.status, 'Stage:', data.rideStage);

          if (data.rideStage === "TO_PICKUP" && data.status === "ACCEPTED") {
            const driverId = data.driverId;

            if (driverId) {
             // console.log('Driver accepted! ID:', driverId);

              // Get driver location from Realtime Database FIRST
              const driverLocationRef = ref(realtimeDb, `drivers/${driverId}`);
              
              onValue(driverLocationRef, async (locationSnapshot) => {
                //console.log('Realtime DB check - exists:', locationSnapshot.exists());
                
                if (locationSnapshot.exists()) {
                  const locationData = locationSnapshot.val();
                  //console.log('Driver location from Realtime DB:', locationData);
                  
                  const driverLat = locationData.latitude || 0;
                  const driverLng = locationData.longitude || 0;

                  // Calculate distance
                  const distance = calculateDistanceBetween(
                    driverLat,
                    driverLng,
                    pickupLocation.lat,
                    pickupLocation.lng
                  );

                  // Try to get additional driver details from Firestore
                  let driverName = "Driver";
                  let vehicleType = data.vehicleType || "Standard Car";
                  let rating = 4.5;
                  let numberPlate = "Unknown";

                  try {
                    const driverQuery = query(
                      collection(db, "driverDetails"),
                      where("userId", "==", driverId)
                    );
                    const querySnapshot = await getDocs(driverQuery);

                    if (!querySnapshot.empty) {
                      const driverDoc = querySnapshot.docs[0].data();
                      driverName = driverDoc.name || driverName;
                      vehicleType = driverDoc.vehicleType || vehicleType;
                      rating = driverDoc.averageRating || rating;
                      numberPlate = driverDoc.numberPlate || numberPlate;
                     // console.log('Got driver details from Firestore');
                    } else {
                      //console.log('No driverDetails found, using defaults');
                    }
                  } catch (error) {
                   // console.log('Error fetching driverDetails:', error);
                  }

                  const driver = {
                    id: driverId,
                    name: driverName,
                    latitude: driverLat,
                    longitude: driverLng,
                    distance: distance,
                    vehicleType: vehicleType,
                    rating: rating,
                    numberPlate: numberPlate
                  };

                  //console.log('Setting driver:', driver);
                  setAcceptedDrivers([driver]);
                } else {
                  //console.log('No location in Realtime DB, using Firestore fallback');
                  
                  // Fallback to Firestore data
                  const driver = {
                    id: driverId,
                    name: data.driverName || "Driver",
                    latitude: data.driverLatitude || 0,
                    longitude: data.driverLongitude || 0,
                    distance: data.distance || 0,
                    vehicleType: data.vehicleType || "Standard Car",
                    rating: data.rating || 4.5,
                    numberPlate: "Unknown"
                  };
                  
                  setAcceptedDrivers([driver]);
                }
              }, (error) => {
                console.error('Realtime DB error:', error);
              });
            }
          }
        }
      }
    );

    return () => {
      //console.log('Cleaning up driver listener');
      unsubscribe();
    };
  }, [showDriverSelection, currentRideId]);

    const handleDriverSelect = async (driver) => {
  setSelectedDriver(driver);
  
  try {
    const distanceInKm = routeInfo ? routeInfo.distanceValue / 1000 : 0;
    const totalCost = selectedVehicle.baseFare + (selectedVehicle.perKmRate * distanceInKm);

    // Update ride with selected driver
    const rideRequestRef = doc(db, "rideRequests", currentRideId);
    await setDoc(rideRequestRef, {
      selectedDriverId: driver.id,
      selectedDriverName: driver.name,
      driverConfirmed: true,
      lastUpdated: serverTimestamp()
    }, { merge: true });

    console.log('Driver selected successfully');
    
    // Close driver selection dialog
    setShowDriverSelection(false);
    setAcceptedDrivers([]);
    setSelectedDriver(null);
    
    // Show tracking dialog
    setShowTrackingDialog(true);
    
  } catch (error) {
    console.error("Error selecting driver:", error);
    alert(`Failed to select driver: ${error.message}`);
  }
};
  

  if (!showDriverSelection) return null;

  const etaMinutes = (driver) => Math.ceil(driver.distance / 0.5);

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          Select a Driver
        </h3>

        {acceptedDrivers.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px 20px' }}>
            <div style={{
              width: '50px',
              height: '50px',
              border: '4px solid #f3f4f6',
              borderTop: '4px solid #7c3aed',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            <p style={{ color: '#6b7280', fontSize: '14px' }}>
              Waiting for drivers to accept...
            </p>
          </div>
        ) : (
          
          <div>
            {acceptedDrivers.map((driver) => (
              <div
                key={driver.id}
                onClick={() => handleDriverSelect(driver)}
                style={{
                  padding: '16px',
                  marginBottom: '12px',
                  border: '2px solid #e5e7eb',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  backgroundColor: selectedDriver?.id === driver.id ? '#f5f3ff' : 'white'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.borderColor = '#7c3aed';
                  e.currentTarget.style.backgroundColor = '#faf5ff';
                }}
                onMouseOut={(e) => {
                  if (selectedDriver?.id !== driver.id) {
                    e.currentTarget.style.borderColor = '#e5e7eb';
                    e.currentTarget.style.backgroundColor = 'white';
                  }
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
    <div style={{ 
      width: '40px', 
      height: '40px', 
      borderRadius: '50%', 
      backgroundColor: '#f3f4f6',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    }}>
      <User size={20} className="text-gray-700" strokeWidth={2} />
    </div>
    <span style={{ fontWeight: '600', fontSize: '16px', color: '#1f2937' }}>
      {driver.name}
    </span>
  </div>
  <CheckCircle size={24} className="text-purple-700" strokeWidth={2.5} fill="currentColor" />
</div>

<div style={{ height: '1px', backgroundColor: '#e5e7eb', margin: '8px 0' }}></div>

<div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap', fontSize: '14px' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280' }}>
    <Star size={16} className="text-yellow-500" strokeWidth={2} fill="currentColor" />
    <span style={{ color: '#1f2937', fontWeight: '500' }}>{driver.rating.toFixed(1)}</span>
  </div>

  <div style={{ display: 'flex', alignItems: 'center', gap: '4px', color: '#6b7280' }}>
    <Car size={16} className="text-gray-700" strokeWidth={2} />
    <span style={{ color: '#1f2937' }}>{driver.vehicleType}</span>
  </div>

  {driver.numberPlate !== "Unknown" && (
    <div style={{ 
      display: 'flex', 
      alignItems: 'center', 
      gap: '4px', 
      backgroundColor: '#f3f4f6',
      padding: '2px 8px',
      borderRadius: '4px',
      fontSize: '13px',
      fontWeight: '500',
      color: '#6b7280'
    }}>
      <span>{driver.numberPlate}</span>
    </div>
  )}
</div>

<div style={{ display: 'flex', gap: '16px', marginTop: '12px', fontSize: '14px' }}>
  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
    <MapPin size={16} className="text-red-500" strokeWidth={2} fill="currentColor" />
    <span style={{ color: '#1f2937', fontWeight: '500' }}>
      {driver.distance.toFixed(1)} km away
    </span>
  </div>

  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
    <Clock size={16} className="text-purple-700" strokeWidth={2} />
    <span style={{ color: '#7c3aed', fontWeight: '600' }}>
      {etaMinutes(driver) < 1 ? '< 1 min' : `${etaMinutes(driver)} min`}
    </span>
  </div>
</div>
</div>
            ))}
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );

};

  // Booking Dialog Component
const BookingDialog = () => {
  if (!showBookingDialog) return null;

  const distanceInKm = routeInfo ? routeInfo.distanceValue / 1000 : 0;

  const handleNext = () => {
    if (currentStep === 0 && selectedVehicle) {
      setCurrentStep(1);
    }
  };

  const handleConfirm = async () => {
  if (selectedVehicle && selectedPayment && !bookingLoading) {
    const totalCost = selectedVehicle.baseFare + (selectedVehicle.perKmRate * distanceInKm);
    
    if (!currentUser) {
      alert("Please log in to continue");
      return;
    }

    const userId = currentUser.uid;
    const userEmail = currentUser.email;
    const userName = currentUser.displayName || "Guest User";

    setBookingLoading(true);

    try {
      // 1. Update passenger ID and name
      await updatePassengerId(userId, userName);

      // 2. Update pickup location
      await updateUserLocation(
        userId,
        pickupLocation,
        "pickup",
        pickupAddress
      );

      // 3. Update destination location
      await updateUserLocation(
        userId,
        destinationLocation,
        "destination",
        destinationAddress
      );

      // 4. Store vehicle selection
      await updateUserVehiclePreference(userId, selectedVehicle);

      // 5. Store payment selection
      await updateUserPaymentMethod(userId, selectedPayment.type);

      // 6. Store the calculated price
      await updateRidePrice(userId, totalCost);

      // 7. FINALLY set ride status to PENDING
      await setRidePending(userId, userEmail, totalCost);

      console.log("Booking successfully stored in database!");

      // Store the ride ID for tracking
      setCurrentRideId(userId);

      // Close booking dialog
      setShowBookingDialog(false);
      setCurrentStep(0);

      // Show driver selection dialog
      setShowDriverSelection(true);

    } catch (error) {
      console.error("Error creating booking:", error);
      alert(`Failed to create booking: ${error.message}`);
    } finally {
      setBookingLoading(false);
    }
  }
};

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 2000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '24px',
        width: '90%',
        maxWidth: '500px',
        maxHeight: '80vh',
        overflowY: 'auto',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)'
      }}>
        {/* Header */}
        <h3 style={{
          fontSize: '20px',
          fontWeight: '600',
          color: '#1f2937',
          marginBottom: '20px',
          textAlign: 'center'
        }}>
          {currentStep === 0 ? 'Select Vehicle Type' : 'Select Payment Method'}
        </h3>

        {/* Step 0: Vehicle Selection */}
        {currentStep === 0 && (
          <div>
            {vehicleOptions.map((vehicle) => {
              const isSelected = selectedVehicle?.type === vehicle.type;
              const estimatedCost = vehicle.baseFare + (vehicle.perKmRate * distanceInKm);
              
              return (
                <div
                  key={vehicle.type}
                  onClick={() => setSelectedVehicle(vehicle)}
                  style={{
                    padding: '16px',
                    marginBottom: '12px',
                    border: `2px solid ${isSelected ? '#7c3aed' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#f5f3ff' : 'white',
                    transition: 'all 0.2s'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className={`${vehicle.color}`}>
                        <vehicle.icon size={32} strokeWidth={2} />
                      </div>
                      {/* <span style={{ fontSize: '32px' }}>{vehicle.icon}</span> */}
                      <div>
                        <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '16px' }}>
                          {vehicle.type}
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                          {vehicle.capacity}
                        </div>
                      </div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div style={{ fontWeight: '700', color: '#7c3aed', fontSize: '18px' }}>
                        KES {estimatedCost.toFixed(2)}
                      </div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                        Estimated fare
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Step 1: Payment Selection */}
        {currentStep === 1 && (
          <div>
            {paymentMethods.map((payment) => {
              const isSelected = selectedPayment?.type === payment.type;
              
              return (
                <div
                  key={payment.type}
                  onClick={() => setSelectedPayment(payment)}
                  style={{
                    padding: '16px',
                    marginBottom: '12px',
                    border: `2px solid ${isSelected ? '#059669' : '#e5e7eb'}`,
                    borderRadius: '8px',
                    cursor: 'pointer',
                    backgroundColor: isSelected ? '#f0fdf4' : 'white',
                    transition: 'all 0.2s',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}
                >
                  <div className={`${payment.color}`}>
                    <payment.icon size={32} strokeWidth={2} />
                  </div>
                  {/* <span style={{ fontSize: '32px' }}>{payment.icon}</span> */}
                  <div style={{ fontWeight: '600', color: '#1f2937', fontSize: '16px' }}>
                    {payment.type}
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Buttons */}
        <div style={{
          marginTop: '24px',
          display: 'flex',
          justifyContent: 'flex-end',
          gap: '12px'
        }}>
          <button
            onClick={currentStep === 0 ? handleNext : handleConfirm}
            disabled={currentStep === 0 ? !selectedVehicle : !selectedPayment}
            style={{
              padding: '10px 24px',
              backgroundColor: (currentStep === 0 ? !selectedVehicle : !selectedPayment) ? '#9ca3af' : '#059669',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              fontWeight: '600',
              fontSize: '14px',
              cursor: (currentStep === 0 ? !selectedVehicle : !selectedPayment) ? 'not-allowed' : 'pointer',
              transition: 'all 0.2s'
            }}
          >
            {currentStep === 0 ? 'Next' : 'Confirm Booking'}
          </button>
        </div>
      </div>
    </div>
  );
};

  return (
    // <LoadScript
    //   googleMapsApiKey={import.meta.env.VITE_GOOGLE_MAPS_API_KEY}
    //   libraries={libraries}
    // >
    <>

      <div style={{ paddingTop: '0px' }}></div>

      {/* Container - Full viewport */}
      <div style={{
        position: 'relative',
        //top: 0,
        //left: 0,
        width: '100%',
        height: 'calc(100vh - 64px)',
        margin: 0,
        padding: 0,
        overflow: 'hidden',
        minWidth: '100vw' 
      }}>
        {/* Full-screen Google Map */}
        <GoogleMap
          mapContainerStyle={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            width: '100%',
            height: '100%'
          }}
          center={mapCenter}
          zoom={pickupLocation && destinationLocation ? 12 : 14}
          options={{
            zoomControl: true,
            streetViewControl: false,
            mapTypeControl: false,
            fullscreenControl: false,
            styles: [
              {
                featureType: "poi",
                elementType: "labels",
                stylers: [{ visibility: "off" }]
              }
            ]
          }}
        >
          {/* Pickup Marker */}
          {pickupLocation && !directionsResponse && (
            <Marker
              position={pickupLocation}
              icon={{
                url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%236b21a8'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
                scaledSize: { width: 40, height: 40 },
              }}
              title={useCurrentLocation ? "Current Location (Pickup)" : "Pickup Location"}
            />
          )}

          {/* Destination Marker */}
          {destinationLocation && !directionsResponse && (
            <Marker
              position={destinationLocation}
              icon={{
                url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%23059669'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
                scaledSize: { width: 40, height: 40 },
              }}
              title="Destination"
            />
          )}

          {/* Directions Renderer */}
          {directionsResponse && (
            <DirectionsRenderer 
              directions={directionsResponse}
              options={{
                suppressMarkers: false,
                polylineOptions: {
                  strokeColor: '#4f46e5',
                  strokeOpacity: 0.8,
                  strokeWeight: 4,
                },
                markerOptions: {
                  origin: {
                    icon: {
                      url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%236b21a8'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
                      scaledSize: { width: 40, height: 40 },
                    }
                  },
                  destination: {
                    icon: {
                      url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%23059669'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
                      scaledSize: { width: 40, height: 40 },
                    }
                  }
                }
              }}
            />
          )}
        </GoogleMap>

        {/* Form Overlay Panel - Left Sidebar */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '400px',
          height: '100%',
          backgroundColor: 'rgba(255, 255, 255, 0.95)',
          backdropFilter: 'blur(8px)',
          WebkitBackdropFilter: 'blur(8px)',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          borderRight: '1px solid rgba(229, 231, 235, 1)',
          zIndex: 1000,
          overflowY: 'auto',
          fontFamily: 'system-ui, -apple-system, sans-serif'
        }}>
          <div style={{ padding: '24px' }}>
            <div>
              {/* Header */}
              <div style={{ textAlign: 'center', marginBottom: '24px' }}>
                <h2 style={{ 
                  fontSize: '24px', 
                  fontWeight: 'bold', 
                  color: '#6b21a8',
                  margin: '0 0 8px 0'
                }}>
                  Book Your Ride
                </h2>
                <p style={{ 
                  fontSize: '14px', 
                  color: '#6b7280', 
                  margin: 0 
                }}>
                  {pickupLocation && destinationLocation
                    ? "Both locations selected"
                    : pickupLocation
                    ? "Pickup selected, choose destination"
                    : destinationLocation
                    ? "Destination selected, choose pickup"
                    : "Select your pickup and destination"}
                </p>
              </div>
              

              {/* Pickup Location Section */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151',
                  marginBottom: '12px'
                }}>
                  Pickup Location
                </label>
                
                {/* Current Location Button */}
                <button
                  type="button"
                  onClick={getCurrentLocation}
                  disabled={currentLocationLoading}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    fontSize: '14px',
                    fontWeight: '500',
                    borderRadius: '8px',
                    border: '1px solid #d1d5db',
                    cursor: currentLocationLoading ? 'not-allowed' : 'pointer',
                    backgroundColor: useCurrentLocation ? '#7c3aed' : '#f9fafb',
                    color: useCurrentLocation ? 'white' : '#374151',
                    transition: 'all 0.2s',
                    marginBottom: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                  onMouseOver={(e) => {
                    if (!currentLocationLoading && !useCurrentLocation) {
                      e.target.style.backgroundColor = '#f3f4f6';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!useCurrentLocation) {
                      e.target.style.backgroundColor = '#f9fafb';
                    }
                  }}
                >
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 8c-2.21 0-4 1.79-4 4s1.79 4 4 4 4-1.79 4-4-1.79-4-4-4zm8.94 3c-.46-4.17-3.77-7.48-7.94-7.94V1h-2v2.06C6.83 3.52 3.52 6.83 3.06 11H1v2h2.06c.46 4.17 3.77 7.48 7.94 7.94V23h2v-2.06c4.17-.46 7.48-3.77 7.94-7.94H23v-2h-2.06zM12 19c-3.87 0-7-3.13-7-7s3.13-7 7-7 7 3.13 7 7-3.13 7-7 7z"/>
                  </svg>
                  {currentLocationLoading ? 'Getting Current Location...' : 'Use Current Location'}
                </button>

                {/* Pickup Input */}
                <Autocomplete 
                  onLoad={ref => pickupAutocompleteRef.current = ref}
                  onPlaceChanged={handlePickupPlaceSelect}
                >
                  <input
                    type="text"
                    placeholder="Or enter pickup address"
                    value={pickupAddress}
                    onChange={handlePickupInputChange}
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none',
                      boxSizing: 'border-box',
                      backgroundColor: useCurrentLocation ? '#f3f4f6' : 'white'
                    }}
                  />
                </Autocomplete>
              </div>

              {/* Destination Section */}
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block',
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Destination
                </label>
                <Autocomplete 
                  onLoad={ref => destinationAutocompleteRef.current = ref}
                  onPlaceChanged={handleDestinationPlaceSelect}
                >
                  <input
                    type="text"
                    placeholder="Enter destination"
                    required
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #d1d5db',
                      borderRadius: '8px',
                      fontSize: '16px',
                      outline: 'none',
                      boxSizing: 'border-box'
                    }}
                  />
                </Autocomplete>
              </div>

              {/* Route Summary */}
              {pickupLocation && destinationLocation && (
                <div style={{
                  background: 'linear-gradient(to right, #faf5ff, #f0fdf4)',
                  padding: '16px',
                  borderRadius: '8px',
                  border: '1px solid #e5e7eb',
                  marginBottom: '20px'
                }}>
                  <h4 style={{
                    fontWeight: '500',
                    color: '#1f2937',
                    margin: '0 0 12px 0',
                    fontSize: '16px'
                  }}>
                    Route Summary
                  </h4>
                  
                  {/* Route Info */}
                  {loadingRoute && (
                    <div style={{
                      fontSize: '14px',
                      color: '#6b7280',
                      fontStyle: 'italic',
                      marginBottom: '12px'
                    }}>
                      Calculating route...
                    </div>
                  )}
                  
                  {routeInfo && (
                    <div style={{
                      backgroundColor: 'rgba(99, 102, 241, 0.1)',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginBottom: '4px'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          Distance:
                        </span>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#4f46e5'
                        }}>
                          {routeInfo.distance}
                        </span>
                      </div>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          Arrive in:
                        </span>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#4f46e5'
                        }}>
                          {routeInfo.duration}
                        </span>
                      </div>
                    </div>
                  )}
                  
                  {/* Fallback distance if no route */}
                  {!routeInfo && !loadingRoute && pickupLocation && destinationLocation && (
                    <div style={{
                      backgroundColor: 'rgba(156, 163, 175, 0.1)',
                      padding: '12px',
                      borderRadius: '6px',
                      marginBottom: '12px'
                    }}>
                      <div style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between',
                        alignItems: 'center'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#374151'
                        }}>
                          Straight-line distance:
                        </span>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#6b7280'
                        }}>
                          {calculateStraightDistance(pickupLocation, destinationLocation)} km
                        </span>
                      </div>
                      <div style={{
                        fontSize: '12px',
                        color: '#9ca3af',
                        marginTop: '4px'
                      }}>
                        Route calculation unavailable
                      </div>
                    </div>
                  )}
                  
                  {/* Locations */}
                  <div style={{ fontSize: '14px', color: '#6b7280' }}>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px',
                      marginBottom: '4px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#7c3aed',
                        borderRadius: '50%'
                      }}></div>
                      <span style={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {pickupAddress}
                      </span>
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      gap: '8px'
                    }}>
                      <div style={{
                        width: '8px',
                        height: '8px',
                        backgroundColor: '#059669',
                        borderRadius: '50%'
                      }}></div>
                      <span style={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {destinationAddress}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="button"
                onClick={handleSubmit}
                disabled={!pickupLocation || !destinationLocation}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  fontWeight: '600',
                  borderRadius: '8px',
                  border: 'none',
                  fontSize: '16px',
                  cursor: (!pickupLocation || !destinationLocation) ? 'not-allowed' : 'pointer',
                  backgroundColor: (!pickupLocation || !destinationLocation) ? '#9ca3af' : '#059669',
                  color: 'white',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  if (pickupLocation && destinationLocation) {
                    e.target.style.backgroundColor = '#047857';
                  }
                }}
                onMouseOut={(e) => {
                  if (pickupLocation && destinationLocation) {
                    e.target.style.backgroundColor = '#059669';
                  }
                }}
              >
                {!pickupLocation || !destinationLocation 
                  ? 'Select locations to continue' 
                  : 'Confirm Ride'
                }
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Booking Dialog */}
        <BookingDialog />  
        
      {/* Driver Selection Dialog */}
        <DriverSelectionDialog />

        {/* Tracking Dialog */}
<TrackingDialog />
           

        {/* Tracking Screen */}
 {showTrackingScreen && (
  <TrackingScreen
    rideId={currentRideId}
    pickupLocation={pickupLocation}
    pickupAddress={pickupAddress}
    onClose={() => setShowTrackingScreen(false)}
  />
)}
</>
    //</LoadScript>
  );
}



















