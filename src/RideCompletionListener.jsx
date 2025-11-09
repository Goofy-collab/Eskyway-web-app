import { useState, useEffect } from 'react';
import { useAuth } from './AuthContext';
import { db } from './firebase';
import { collection, query, where, onSnapshot, doc, updateDoc, addDoc, getDocs, setDoc } from 'firebase/firestore';
import { Star, ThumbsUp, Smile, Meh, Frown } from "lucide-react";

export default function RideCompletionListener({ showToast }) { 
  const { currentUser } = useAuth();
  const [showConfirmationDialog, setShowConfirmationDialog] = useState(false);
  const [showRatingDialog, setShowRatingDialog] = useState(false);
  const [currentRide, setCurrentRide] = useState(null);
  const [rideToRate, setRideToRate] = useState(null);

  useEffect(() => {
    if (!currentUser) return;

    const userId = currentUser.uid;

    const q = query(
      collection(db, 'rideRequests'),
      where('passengerId', '==', userId),
      where('status', '==', 'PENDING_COMPLETION'),
      where('driverCompletionRequest', '==', true)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      if (!snapshot.empty && !showConfirmationDialog) {
        const rideDoc = snapshot.docs[0];
        const rideData = {
          id: rideDoc.id,
          ...rideDoc.data()
        };
        setCurrentRide(rideData);
        setShowConfirmationDialog(true);
      }
    });

    return () => unsubscribe();
  }, [currentUser, showConfirmationDialog]);

  const handleConfirmArrival = async () => {
    if (!currentRide) return;

    try {
      await updateDoc(doc(db, 'rideRequests', currentRide.id), {
        status: 'COMPLETED',
        rideStage: 'COMPLETED',
        passengerConfirmed: true,
        completionTime: Date.now()
      });

      setShowConfirmationDialog(false);
      setRideToRate(currentRide);
      setShowRatingDialog(true);
    } catch (error) {
      console.error('Error confirming ride:', error);
      showToast('Failed to confirm ride completion. Please try again.', 'error');
    }
  };

  const handleDisputeArrival = async () => {
    if (!currentRide) return;

    try {
      await updateDoc(doc(db, 'rideRequests', currentRide.id), {
        passengerDisputed: true,
        passengerDisputeTime: Date.now()
      });

      showToast("You've indicated you haven't arrived yet. The driver has been notified.", 'info');
      setShowConfirmationDialog(false);
      setCurrentRide(null);
    } catch (error) {
      console.error('Error disputing arrival:', error);
      showToast('Failed to submit dispute. Please try again.', 'error');
    }
  };

  return (
    <>
      {showConfirmationDialog && currentRide && (
        <RideCompletionDialog
          ride={currentRide}
          onConfirm={handleConfirmArrival}
          onDispute={handleDisputeArrival}
        />
      )}

      {showRatingDialog && rideToRate && (
        <RateDriverDialog
          ride={rideToRate}
          showToast={showToast}  
          onClose={() => {
            setShowRatingDialog(false);
            setRideToRate(null);
            setCurrentRide(null);
          }}
        />
      )}
    </>
  );
}

// Ride Completion Confirmation Dialog
function RideCompletionDialog({ ride, onConfirm, onDispute }) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slideUp">
        <div className="flex justify-center mb-4">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
        </div>

        <h2 className="text-2xl font-bold text-gray-900 text-center mb-2">
          Ride Completion Confirmation
        </h2>

        <div className="text-center mb-6">
          <p className="text-gray-700 mb-3">
            Your driver has marked this ride as complete.
          </p>
          <div className="bg-gray-50 rounded-lg p-3 mb-3">
            <p className="text-sm text-gray-600 mb-1">Destination:</p>
            <p className="font-semibold text-gray-900">
              {ride.destinationAddress || 'Your destination'}
            </p>
          </div>
          <p className="text-lg font-semibold text-gray-900">
            Have you arrived at your destination?
          </p>
        </div>

        <div className="space-y-3">
          <button
            onClick={onConfirm}
            className="w-full bg-green-500 hover:bg-green-600 text-white font-semibold py-3 px-6 rounded-xl transition-all hover:shadow-lg flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Yes, I've Arrived
          </button>

          <button
            onClick={onDispute}
            className="w-full bg-purple-700 hover:bg-purple-800 text-white font-semibold py-3 px-6 rounded-xl transition-all hover:shadow-lg flex items-center justify-center gap-2"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
            No, Not Yet
          </button>
        </div>
      </div>
    </div>
  );
}

// Rate Driver Dialog - Updated with Toast
function RateDriverDialog({ ride, onClose, showToast }) { 
  const { currentUser } = useAuth();
  const [rating, setRating] = useState(0);
  const [feedback, setFeedback] = useState('');
  const [hoveredStar, setHoveredStar] = useState(0);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (rating === 0) {
      showToast('Please select a rating', 'error');  
      return;
    }

    setSubmitting(true);

    try {
      const ratingData = {
        rideId: ride.id,
        passengerId: ride.passengerId,
        rating: rating,
        feedback: feedback,
        timestamp: Date.now()
      };

      // 1. Update the ride with the rating
      await updateDoc(doc(db, 'rideRequests', ride.id), {
        driverRating: rating,
        driverFeedback: feedback
      });

      // 2. Add rating to driver's ratings collection
      const driverId = ride.driverId;
      await addDoc(collection(db, 'driverDetails', driverId, 'ratings'), ratingData);

      // 3. Update driver's average rating
      await updateDriverAverageRating(driverId);

      // 4. Add to passenger's ride history
      if (ride.passengerId) {
        await setDoc(
          doc(db, 'passengers', ride.passengerId, 'rideHistory', ride.id),
          { driverRating: rating, feedback: feedback },
          { merge: true }
        );
      }

      // 5. Add to driver's ride history
      await setDoc(
        doc(db, 'driverDetails', driverId, 'rideHistory', ride.id),
        { rating: rating, feedback: feedback },
        { merge: true }
      );

      showToast('Thank you for rating your driver!', 'success');
      onClose();
    } catch (error) {
      console.error('Error submitting rating:', error);
      showToast('Failed to submit rating. Please try again.', 'error'); 
    } finally {
      setSubmitting(false);
    }
  };

  const updateDriverAverageRating = async (driverId) => {
    try {
      const ratingsSnapshot = await getDocs(
        collection(db, 'driverDetails', driverId, 'ratings')
      );

      if (!ratingsSnapshot.empty) {
        let totalRating = 0;
        const ratingCount = ratingsSnapshot.size;

        ratingsSnapshot.forEach(doc => {
          totalRating += doc.data().rating || 0;
        });

        const averageRating = totalRating / ratingCount;

        await updateDoc(doc(db, 'driverDetails', driverId), {
          averageRating: averageRating,
          totalRatings: ratingCount,
          totalRatingSum: totalRating
        });
      }
    } catch (error) {
      console.error('Error updating average rating:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-[9999] p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full p-6 animate-slideUp">
        <div className="text-center mb-6">
          <div className="flex justify-center mb-4">
            <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
              <svg className="w-8 h-8 text-yellow-600" fill="currentColor" viewBox="0 0 20 20">
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </div>
          </div>

          <h2 className="text-2xl font-bold text-gray-900 mb-2">
            Rate Your Driver
          </h2>
          <p className="text-gray-600">
            How was your ride with <span className="font-semibold">{ride.driverName || 'your driver'}</span>?
          </p>
        </div>

        <div className="flex justify-center gap-2 mb-6">
          {[1, 2, 3, 4, 5].map((star) => (
            <button
              key={star}
              onClick={() => setRating(star)}
              onMouseEnter={() => setHoveredStar(star)}
              onMouseLeave={() => setHoveredStar(0)}
              className="transition-transform hover:scale-110 focus:outline-none"
            >
              <svg
                className={`w-12 h-12 ${
                  star <= (hoveredStar || rating)
                    ? 'text-yellow-400'
                    : 'text-gray-300'
                }`}
                fill="currentColor"
                viewBox="0 0 20 20"
              >
                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
              </svg>
            </button>
          ))}
        </div>

        {rating > 0 && (
  <p className="text-center text-gray-700 font-semibold mb-4 flex items-center justify-center gap-2">
    {rating === 5 && (
      <>
        <Star className="text-yellow-500 fill-yellow-500" /> Excellent!
      </>
    )}
    {rating === 4 && (
      <>
        <ThumbsUp className="text-green-500" /> Great!
      </>
    )}
    {rating === 3 && (
      <>
        <Smile className="text-blue-500" /> Good
      </>
    )}
    {rating === 2 && (
      <>
        <Meh className="text-gray-500" /> Fair
      </>
    )}
    {rating === 1 && (
      <>
        <Frown className="text-red-500" /> Poor
      </>
    )}
  </p>
)}

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Additional Feedback (Optional)
          </label>
          <textarea
            value={feedback}
            onChange={(e) => setFeedback(e.target.value)}
            placeholder="Share your experience..."
            rows={3}
            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent outline-none resize-none"
          />
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={submitting}
            className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-semibold py-3 px-6 rounded-xl transition-colors disabled:opacity-50"
          >
            Skip
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting || rating === 0}
            className="flex-1 bg-purple-700 hover:bg-purple-600 text-white font-semibold py-3 px-6 rounded-xl transition-all hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                Submitting...
              </>
            ) : (
              'Submit Rating'
            )}
          </button>
        </div>
      </div>

      <style>{`
        @keyframes slideUp {
          from {
            opacity: 0;
            transform: translateY(30px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .animate-slideUp {
          animation: slideUp 0.3s ease-out;
        }
      `}</style>
    </div>
  );
}


