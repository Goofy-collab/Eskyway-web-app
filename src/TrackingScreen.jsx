import React, { useState, useEffect } from 'react';
import { doc, onSnapshot, collection, query, where, getDocs, updateDoc } from 'firebase/firestore';
import { ref, onValue } from 'firebase/database';
import { db, realtimeDb } from './firebase';
import { GoogleMap, Marker, DirectionsRenderer } from '@react-google-maps/api';
import { 
  Car, 
  MapPin, 
  Phone, 
  Copy, 
  Check, 
  User, 
  X, 
  ArrowLeft,
  Clock,
  Bell,
  CircleCheck,
  Info
} from 'lucide-react';


export default function TrackingScreen({ 
  rideId, 
  pickupLocation, 
  pickupAddress,
  onClose,
  showToast
}) { 

  const [rideData, setRideData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [driverRealtimeLocation, setDriverRealtimeLocation] = useState(null);
  const [trackingEta, setTrackingEta] = useState('Calculating...');
  const [directionsResponse, setDirectionsResponse] = useState(null);
  const [showContactModal, setShowContactModal] = useState(false);
  const [hasNotifiedArrival, setHasNotifiedArrival] = useState(false); 

  // Calculate distance between two points
  const calculateDistanceBetween = (lat1, lon1, lat2, lon2) => {
    const R = 6371;
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c;
  };

  // Check if driver has arrived at pickup location
  const checkDriverArrival = async (driverLat, driverLng, pickupLat, pickupLng) => {
    const distance = calculateDistanceBetween(driverLat, driverLng, pickupLat, pickupLng);
    
    // If driver is within 50 meters (0.05 km) of pickup location
    if (distance <= 0.05 && !hasNotifiedArrival) {
      //console.log('Driver has arrived! Distance:', distance);
      
      try {
        // Update the ride stage to ARRIVED_AT_PICKUP
        const rideRef = doc(db, "rideRequests", rideId);
        await updateDoc(rideRef, {
          rideStage: 'ARRIVED_AT_PICKUP',
          driverArrivedAt: new Date().toISOString()
        });
        
        setHasNotifiedArrival(true);
        showToast('Your driver has arrived!', 'success');
      } catch (error) {
        console.error('Error updating arrival status:', error);
      }
    }
  };

  useEffect(() => {
  if (!rideId) return;

  //console.log('Loading tracking for ride:', rideId);
  setLoading(true);

  // Listen to ride document
  const unsubscribe = onSnapshot(
    doc(db, "rideRequests", rideId),
  async (snapshot) => {
    if (snapshot.exists()) {
      const data = snapshot.data();
      
      //console.log('Raw ride data:', data);

      // If we have a driverId, fetch complete driver details
      if (data.driverId) {
        try {
          const driverQuery = query(
            collection(db, "driverDetails"),
            where("userId", "==", data.driverId)
          );
          const driverSnapshot = await getDocs(driverQuery);

          if (!driverSnapshot.empty) {
            const driverDetails = driverSnapshot.docs[0].data();
            
            //console.log('Driver details fetched:', driverDetails);

            // Merge driver details into ride data
            const enrichedData = {
              ...data,
              driverName: driverDetails.name || data.driverName || 'Driver',
              driverNumberPlate: driverDetails.numberPlate || data.driverNumberPlate || 'Unknown',
              driverPhoneNumber: driverDetails.phoneNumber || data.driverPhoneNumber || 'Unknown',
              vehicleType: driverDetails.vehicleType || data.vehicleType || 'Standard Car'
            };

            setRideData(enrichedData);
          } else {
            console.log('No driver details found, using ride data only');
            setRideData(data);
          }
        } catch (error) {
          console.error('Error fetching driver details:', error);
          setRideData(data);
        }
      } else {
        setRideData(data);
      }
      
      setLoading(false);

      //console.log('Ride stage:', data.rideStage);

        // Listen to driver's real-time location
        if (data.driverId) {
          const driverLocationRef = ref(realtimeDb, `drivers/${data.driverId}`);
          
          onValue(driverLocationRef, async (locationSnapshot) => {
            if (locationSnapshot.exists()) {
              const locationData = locationSnapshot.val();
              const driverPos = {
                lat: locationData.latitude || 0,
                lng: locationData.longitude || 0
              };
              
              setDriverRealtimeLocation(driverPos);

              // Calculate route using Directions API
              if (pickupLocation && driverPos.lat !== 0 && driverPos.lng !== 0) {
                try {
                  const directionsService = new google.maps.DirectionsService();
                  
                  const results = await directionsService.route({
                    origin: driverPos,
                    destination: pickupLocation,
                    travelMode: google.maps.TravelMode.DRIVING,
                  });

                  setDirectionsResponse(results);
                  
                  // Extract ETA from directions
                  const route = results.routes[0];
                  if (route) {
                    const leg = route.legs[0];
                    setTrackingEta(leg.duration.text);
                  }
                } catch (error) {
                  console.error("Error calculating route:", error);
                  // Fallback to straight-line calculation
                  const distance = calculateDistanceBetween(
                    driverPos.lat,
                    driverPos.lng,
                    pickupLocation.lat,
                    pickupLocation.lng
                  );
                  const etaMinutes = Math.ceil(distance / 0.5);
                  setTrackingEta(etaMinutes < 1 ? '< 1 min' : `${etaMinutes} min`);
                }
              }
            }
          });
        }
      }
    }
  );

  return () => unsubscribe();
}, [rideId, pickupLocation]);

useEffect(() => {
    if (driverRealtimeLocation && pickupLocation && 
        driverRealtimeLocation.lat !== 0 && 
        rideData?.rideStage === 'TO_PICKUP') {
      
      checkDriverArrival(
        driverRealtimeLocation.lat,
        driverRealtimeLocation.lng,
        pickupLocation.lat,
        pickupLocation.lng
      );
    }
  }, [driverRealtimeLocation, pickupLocation, rideData?.rideStage, hasNotifiedArrival, rideId]);



  // Ride Status Indicator Component
  const RideStatusIndicator = ({ status }) => {
    const getStatusConfig = () => {
      switch (status) {
        case 'TO_PICKUP':
          return {
            text: 'Driver is on the way',
            color: '#2196F3',
            icon: Car,
            pulse: true
          };
        case 'ARRIVED_AT_PICKUP':
          return {
            text: 'Driver has arrived',
            color: '#FF9800',
            icon: MapPin,
            pulse: true
          };
        case 'IN_PROGRESS':
          return {
            text: 'Ride in progress',
            color: '#4CAF50',
            icon: Car,
            pulse: true
          };
        case 'COMPLETED':
          return {
            text: 'Ride completed',
            color: '#9C27B0',
            icon: CircleCheck,
            pulse: false
          };
        default:
          return {
            text: 'Waiting for driver',
            color: '#9CA3AF',
            icon: Clock,
            pulse: false
          };
      }
    };

    const config = getStatusConfig();

    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px'
      }}>
        <div style={{
          width: '12px',
          height: '12px',
          borderRadius: '50%',
          backgroundColor: config.color,
          animation: config.pulse ? 'pulse 1.5s ease-in-out infinite' : 'none'
        }}></div>
        <span style={{
          fontSize: '14px',
          fontWeight: '600',
          color: config.color
        }}>
          {config.text}
        </span>
      </div>
    );
  };

  if (loading) {
    return (
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'white',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 3000
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{
            width: '50px',
            height: '50px',
            border: '4px solid #f3f4f6',
            borderTop: '4px solid #7c3aed',
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            margin: '0 auto 16px'
          }}></div>
          <p style={{ color: '#6b7280' }}>Loading tracking...</p>
        </div>
      </div>
    );
  }

  const getStageIcon = (stage) => {
    switch (stage) {
      case 'TO_PICKUP': return Car;
      case 'ARRIVED_AT_PICKUP': return Bell;
      case 'IN_PROGRESS': return Car;
      case 'COMPLETED': return CircleCheck;
      default: return Info;
    }
  };

  const StageIcon = getStageIcon(rideData?.rideStage);


  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      zIndex: 3000
    }}>
      <GoogleMap
        mapContainerStyle={{ width: '100%', height: '100%' }}
        center={driverRealtimeLocation || pickupLocation}
        zoom={14}
        options={{
          zoomControl: true,
          streetViewControl: false,
          mapTypeControl: false,
          fullscreenControl: false
        }}
      >
        {/* Pickup Marker */}
        {pickupLocation && (
          <Marker
            position={pickupLocation}
            icon={{
              url: rideData?.rideStage === 'ARRIVED_AT_PICKUP' 
                ? "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%23FF9800'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E"
                : "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%234f46e5'%3E%3Cpath d='M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z'/%3E%3C/svg%3E",
              scaledSize: { width: 40, height: 40 },
            }}
            title="Pickup Location"
          />
        )}

        {/* Driver Marker */}
        {driverRealtimeLocation && driverRealtimeLocation.lat !== 0 && (
          <Marker
            position={driverRealtimeLocation}
            icon={{
              url: "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='40' height='40' viewBox='0 0 24 24' fill='%23059669'%3E%3Cpath d='M18.92 6.01C18.72 5.42 18.16 5 17.5 5h-11c-.66 0-1.21.42-1.42 1.01L3 12v8c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-1h12v1c0 .55.45 1 1 1h1c.55 0 1-.45 1-1v-8l-2.08-5.99zM6.5 16c-.83 0-1.5-.67-1.5-1.5S5.67 13 6.5 13s1.5.67 1.5 1.5S7.33 16 6.5 16zm11 0c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 11l1.5-4.5h11L19 11H5z'/%3E%3C/svg%3E",
              scaledSize: { width: 40, height: 40 },
            }}
            title="Driver"
          />
        )}

    
        {/* Route line using Directions API */}
        {directionsResponse && (
          <DirectionsRenderer 
            directions={directionsResponse}
            options={{
              suppressMarkers: true,
              polylineOptions: {
                strokeColor: '#4f46e5',
                strokeOpacity: 0.8,
                strokeWeight: 4,
              }
            }}
          />
        )}
      </GoogleMap>

     {/* Driver Info Card */}
<div style={{
  position: 'absolute',
  top: '0',
  bottom: '0',
  left: '0',
  width: '380px',
  backgroundColor: 'white',
  borderRadius: '16px',
  padding: '0',
  boxShadow: '0 10px 25px rgba(0,0,0,0.1)',
  zIndex: 10,
  display: 'flex',
  flexDirection: 'column',
  overflow: 'hidden'
}}>
  {/* Header with Back Button */}
  <div style={{
    padding: '16px 20px',
    borderBottom: '1px solid #f3f4f6',
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    backgroundColor: (() => {
      switch (rideData?.rideStage) {
        case 'TO_PICKUP': return '#2196F3';
        case 'ARRIVED_AT_PICKUP': return '#FF9800';
        case 'IN_PROGRESS': return '#4CAF50';
        case 'COMPLETED': return '#9C27B0';
        default: return '#9CA3AF';
      }
    })()
  }}>
    <button
      onClick={onClose}
      style={{
        width: '36px',
        height: '36px',
        borderRadius: '50%',
        backgroundColor: 'rgba(255, 255, 255, 0.2)',
        border: 'none',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.2s',
        color: 'white'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.3)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.backgroundColor = 'rgba(255, 255, 255, 0.2)';
      }}
    >
      <ArrowLeft size={20} />
    </button>
    <h2 style={{
      margin: 0,
      fontSize: '18px',
      fontWeight: '600',
      color: 'white'
    }}>
      {rideData?.rideStage === 'ARRIVED_AT_PICKUP' ? 'Arriving' :
       rideData?.rideStage === 'TO_PICKUP' ? 'On the way' :
       rideData?.rideStage === 'IN_PROGRESS' ? 'In progress' :
       rideData?.rideStage === 'COMPLETED' ? 'Completed' :
       'Your ride'}
    </h2>
  </div>

  {/* Scrollable Content */}
  <div style={{
    flex: 1,
    overflowY: 'auto',
    padding: '20px'
  }}>
    {/* ETA Message */}
    {rideData?.rideStage === 'TO_PICKUP' && (
      <div style={{
        textAlign: 'center',
        marginBottom: '24px'
      }}>
        <p style={{
          margin: 0,
          fontSize: '14px',
          color: '#6b7280'
        }}>
          Your driver is arriving in <span style={{ fontWeight: '600', color: '#1f2937' }}>{trackingEta}</span>
        </p>
      </div>
    )}

    {/* Driver Avatar - Larger */}
    <div style={{
      display: 'flex',
      justifyContent: 'center',
      marginBottom: '20px'
    }}>
      <div style={{
        width: '80px',
        height: '80px',
        borderRadius: '50%',
        backgroundColor: '#e5e7eb',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '3px solid white',
        boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
      }}>
        <User size={40} color="#6b7280" />
      </div>
    </div>

    {/* Status Banner */}
    {rideData?.rideStage && (
      <div style={{
        textAlign: 'center',
        marginBottom: '24px'
      }}>
        <div style={{
          fontSize: '16px',
          fontWeight: '600',
          color: (() => {
            switch (rideData.rideStage) {
              case 'TO_PICKUP': return '#2196F3';
              case 'ARRIVED_AT_PICKUP': return '#FF9800';
              case 'IN_PROGRESS': return '#4CAF50';
              case 'COMPLETED': return '#9C27B0';
              default: return '#9CA3AF';
            }
          })(),
          marginBottom: '4px'
        }}>
          {rideData.rideStage === 'TO_PICKUP' ? 'Arriving' :
           rideData.rideStage === 'ARRIVED_AT_PICKUP' ? 'Arrived' :
           rideData.rideStage === 'IN_PROGRESS' ? 'In Progress' :
           rideData.rideStage === 'COMPLETED' ? 'Completed' :
           'Preparing'}
        </div>
      </div>
    )}

    {/* Driver Details Card */}
    <div style={{
      backgroundColor: '#f9fafb',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '16px'
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '12px',
        marginBottom: '12px'
      }}>
        <div style={{
          width: '48px',
          height: '48px',
          borderRadius: '50%',
          backgroundColor: '#e5e7eb',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <User size={24} color="#6b7280" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontWeight: '600', 
            fontSize: '16px', 
            color: '#1f2937',
            marginBottom: '2px'
          }}>
            {rideData?.driverName || 'Driver'}
          </div>
          <div style={{ 
            fontSize: '13px', 
            color: '#6b7280'
          }}>
            {rideData?.vehicleType || 'Standard Car'}
            {rideData?.driverNumberPlate && rideData.driverNumberPlate !== 'Unknown' && (
              <span style={{ marginLeft: '8px', color: '#9ca3af' }}>• {rideData.driverNumberPlate}</span>
            )}
          </div>
        </div>
      </div>

      {/* Call Now Button */}
      <button
        onClick={() => {
          if (rideData?.driverPhoneNumber && rideData.driverPhoneNumber !== 'Unknown') {
            window.location.href = `tel:${rideData.driverPhoneNumber}`;
          } else {
            showToast("Driver's phone number not available", 'error');
          }
        }}
        style={{
          width: '100%',
          padding: '12px',
          backgroundColor: '#10B981',
          color: 'white',
          border: 'none',
          borderRadius: '10px',
          fontSize: '14px',
          fontWeight: '600',
          cursor: 'pointer',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          gap: '6px',
          transition: 'all 0.2s'
        }}
        onMouseOver={(e) => {
          e.currentTarget.style.backgroundColor = '#059669';
        }}
        onMouseOut={(e) => {
          e.currentTarget.style.backgroundColor = '#10B981';
        }}
      >
        <Phone size={16} />
        Call now
      </button>
    </div>

    {/* Pickup Location */}
    <div style={{
      backgroundColor: 'white',
      border: '1px solid #e5e7eb',
      borderRadius: '12px',
      padding: '16px',
      marginBottom: '12px'
    }}>
      <div style={{ display: 'flex', gap: '12px' }}>
        <div style={{
          width: '32px',
          height: '32px',
          borderRadius: '50%',
          backgroundColor: '#4F46E5',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexShrink: 0
        }}>
          <MapPin size={16} color="white" />
        </div>
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '12px', 
            color: '#6b7280',
            marginBottom: '4px'
          }}>
            Pickup Point
          </div>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: '500',
            color: '#1f2937',
            lineHeight: '1.4'
          }}>
            {pickupAddress || 'Loading address...'}
          </div>
        </div>
      </div>
    </div>

    {/* Drop-off Location (if available) */}
    {rideData?.destinationAddress && (
      <div style={{
        backgroundColor: 'white',
        border: '1px solid #e5e7eb',
        borderRadius: '12px',
        padding: '16px',
        marginBottom: '20px'
      }}>
        <div style={{ display: 'flex', gap: '12px' }}>
          <div style={{
            width: '32px',
            height: '32px',
            borderRadius: '50%',
            backgroundColor: '#10B981',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0
          }}>
            <MapPin size={16} color="white" />
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ 
              fontSize: '12px', 
              color: '#6b7280',
              marginBottom: '4px'
            }}>
              Drop-off Point
            </div>
            <div style={{ 
              fontSize: '14px', 
              fontWeight: '500',
              color: '#1f2937',
              lineHeight: '1.4'
            }}>
              {rideData.destinationAddress}
            </div>
          </div>
        </div>
      </div>
    )}

    {/* Payment Info */}
    <div style={{
      display: 'grid',
      gridTemplateColumns: '1fr 1fr',
      gap: '12px',
      marginBottom: '20px'
    }}>
      <div style={{
        backgroundColor: '#f9fafb',
        padding: '16px',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <div style={{ 
          fontSize: '12px', 
          color: '#6b7280',
          marginBottom: '6px'
        }}>
          Payment
        </div>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: '600',
          color: '#1f2937'
        }}>
          {rideData?.paymentMethod || 'Cash'}
        </div>
      </div>

      <div style={{
        backgroundColor: '#f9fafb',
        padding: '16px',
        borderRadius: '12px',
        textAlign: 'center'
      }}>
        <div style={{ 
          fontSize: '12px', 
          color: '#6b7280',
          marginBottom: '6px'
        }}>
          Amount
        </div>
        <div style={{ 
          fontSize: '16px', 
          fontWeight: '600',
          color: '#1f2937'
        }}>
          Ksh{rideData?.price || '0'}
        </div>
      </div>
    </div>
  </div>
</div>

      {/* Contact Driver Modal */}
      {showContactModal && rideData?.driverPhoneNumber && rideData.driverPhoneNumber !== 'Unknown' && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0, 0, 0, 0.6)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 9999,
            backdropFilter: 'blur(4px)'
          }}
          onClick={() => setShowContactModal(false)}
        >
          <div 
            style={{
              backgroundColor: 'white',
              borderRadius: '16px',
              padding: '24px',
              maxWidth: '400px',
              width: '90%',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.2)',
              animation: 'slideUp 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0
              }}>
                Contact Driver
              </h3>
              <button
                onClick={() => setShowContactModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#9ca3af',
                  lineHeight: 1,
                  padding: '0',
                  width: '32px',
                  height: '32px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#f3f4f6';
                  e.currentTarget.style.color = '#374151';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = 'transparent';
                  e.currentTarget.style.color = '#9ca3af';
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Driver Info Card */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              padding: '16px',
              backgroundColor: '#f9fafb',
              borderRadius: '12px',
              marginBottom: '20px',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{
                width: '48px',
                height: '48px',
                borderRadius: '50%',
                backgroundColor: '#e5e7eb',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '24px'
              }}>
                <User size={24} color="#6b7280" />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontWeight: '600', 
                  fontSize: '16px', 
                  color: '#1f2937',
                  marginBottom: '2px'
                }}>
                  {rideData?.driverName || 'Driver'}
                </div>
                <div style={{ 
                  fontSize: '13px', 
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '4px'
                }}>
                  <span><Car size={14} /></span>
                  <span>{rideData?.vehicleType || 'Standard Car'}</span>
                  {rideData?.driverNumberPlate && rideData.driverNumberPlate !== 'Unknown' && (
                    <span style={{ 
                      marginLeft: '4px',
                      padding: '2px 6px',
                      backgroundColor: '#e5e7eb',
                      borderRadius: '4px',
                      fontSize: '11px',
                      fontWeight: '500'
                    }}>
                      {rideData.driverNumberPlate}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Phone Number Display */}
            <div style={{
              fontSize: '28px',
              fontWeight: '700',
              color: '#10b981',
              textAlign: 'center',
              padding: '20px',
              backgroundColor: '#f0fdf4',
              borderRadius: '12px',
              marginBottom: '20px',
              letterSpacing: '1px',
              border: '2px solid #d1fae5'
            }}>
              {rideData.driverPhoneNumber}
            </div>

            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '10px',
              marginBottom: '12px'
            }}>
              <a
                href={`tel:${rideData.driverPhoneNumber}`}
                style={{
                  flex: 1,
                  padding: '14px',
                  backgroundColor: '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '10px',
                  fontSize: '15px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  textAlign: 'center',
                  textDecoration: 'none',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'all 0.2s'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.backgroundColor = '#059669';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(16, 185, 129, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.backgroundColor = '#10b981';
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                <span style={{ fontSize: '18px' }}><Phone size={18} /></span>
                Call Now
              </a>

              <button
  onClick={async (e) => {
    //console.log('Phone number value:', rideData.driverPhoneNumber);
  //console.log('Clipboard API available:', !!navigator.clipboard);
  //console.log('Secure context:', window.isSecureContext);

    const btn = e.currentTarget;
    const phoneNumber = rideData.driverPhoneNumber;

    // Check if phone number exists and is valid
    if (!phoneNumber || phoneNumber === 'Unknown') {
      showToast('Phone number not available', 'error');
      return;
    }

    try {
      // Try modern clipboard API first
      if (navigator.clipboard && navigator.clipboard.writeText) {
        await navigator.clipboard.writeText(phoneNumber);
        
        // Visual feedback
        const originalText = btn.innerHTML;
        btn.innerHTML = '✓ Copied!';
        btn.style.backgroundColor = '#10b981';
        btn.style.color = 'white';
        
        setTimeout(() => {
          btn.innerHTML = originalText;
          btn.style.backgroundColor = '#f3f4f6';
          btn.style.color = '#374151';
        }, 1500);
        
        showToast('Phone number copied to clipboard!', 'success');
      } else {
        // Fallback for older browsers or non-secure contexts
        const textArea = document.createElement('textarea');
        textArea.value = phoneNumber;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        
        try {
          document.execCommand('copy');
          textArea.remove();
          
          // Visual feedback
          const originalText = btn.innerHTML;
          btn.innerHTML = '✓ Copied!';
          btn.style.backgroundColor = '#10b981';
          btn.style.color = 'white';
          
          setTimeout(() => {
            btn.innerHTML = originalText;
            btn.style.backgroundColor = '#f3f4f6';
            btn.style.color = '#374151';
          }, 1500);
          
          showToast('Phone number copied to clipboard!', 'success');
        } catch (err) {
          textArea.remove();
          throw err;
        }
      }
    } catch (error) {
      console.error('Copy failed:', error);
      showToast('Failed to copy. Please copy manually: ' + phoneNumber, 'error');
    }
  }}
  style={{
    flex: 1,
    padding: '14px',
    backgroundColor: '#f3f4f6',
    color: '#374151',
    border: 'none',
    borderRadius: '10px',
    fontSize: '15px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    transition: 'all 0.2s'
  }}
  onMouseOver={(e) => {
    e.currentTarget.style.backgroundColor = '#e5e7eb';
    e.currentTarget.style.transform = 'translateY(-1px)';
  }}
  onMouseOut={(e) => {
    e.currentTarget.style.backgroundColor = '#f3f4f6';
    e.currentTarget.style.transform = 'translateY(0)';
  }}
>
  <span style={{ fontSize: '18px' }}><Copy size={18} /></span>
  Copy Number
</button>
            </div>

            {/* Helper Text */}
            <div style={{
              fontSize: '12px',
              color: '#9ca3af',
              textAlign: 'center',
              lineHeight: '1.5'
            }}>
              {/iPhone|iPad|iPod|Android/i.test(navigator.userAgent) 
                ? ' Tap "Call Now" to dial directly'
                : 'Click "Copy Number" to copy to clipboard'}
            </div>
          </div>
        </div>
      )}


      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
          @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(20px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
}
















