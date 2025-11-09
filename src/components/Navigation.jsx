import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../AuthContext';
import NotificationDropdown from "./NotificationDropdown";
import RideHistoryDropdown from "../RideHistoryDropdown";
import SavedFlightsDropdown from './SavedFlightsDropdown';
import { useState, useEffect, useRef } from 'react'; 

import {
  Plane,
  Car,
  Bell,
  Bookmark,
  Clock,
  User,
  LogOut,
} from "lucide-react";

export default function Navigation() {
  const location = useLocation();
  const { currentUser, logout } = useAuth();
  const [showAccountMenu, setShowAccountMenu] = useState(false);
  const accountMenuRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  // Close account menu when clicking outside
  useEffect(() => {
    function handleClickOutside(event) {
      if (accountMenuRef.current && !accountMenuRef.current.contains(event.target)) {
        setShowAccountMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <nav className="bg-white shadow-sm border-b border-gray-200 sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span className="text-2xl font-bold">
              <span className="text-purple-700">Esky</span>
              <span className="text-green-500">Way</span>
            </span>
          </Link>

          {/* Flights */}
          <Link
            to="/flights"
            className={`flex flex-col items-center transition-all ${
              isActive("/flights")
                ? "text-purple-600"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Plane size={22} />
            <span className="text-[10px] mt-1 font-medium">Flights</span>
          </Link>

          {/* Rides */}
          <Link
            to="/rides"
            className={`flex flex-col items-center transition-all ${
              isActive("/rides")
                ? "text-purple-600"
                : "text-gray-500 hover:text-gray-800"
            }`}
          >
            <Car size={22} />
            <span className="text-[10px] mt-1 font-medium">Rides</span>
          </Link>

          {/* Right Side - Icons */}
          <div className="flex items-center gap-4">

            {/* Saved Flights Dropdown */}
            <SavedFlightsDropdown />
            
            {/* Ride History Dropdown */}
            <RideHistoryDropdown />

            {/* Notification Dropdown */}
            <NotificationDropdown />
            
            {/* Account Dropdown */}
            <div className="relative" ref={accountMenuRef}>
              <button
                onClick={() => setShowAccountMenu(!showAccountMenu)}
                className="relative p-2 text-gray-600 hover:text-gray-900 transition-colors rounded-full hover:bg-gray-100"
                title="Account"
              >
                <User size={24} />
              </button>

              {/* Account Dropdown Menu */}
              {showAccountMenu && (
                <div className="absolute right-0 mt-2 w-64 bg-white rounded-lg shadow-2xl border border-gray-200 z-50 animate-slideDown">
                  
                  {/* User Info Section */}
                  <div className="p-4 border-b border-gray-200">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                        <User size={20} className="text-purple-700" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold text-gray-900 truncate">
                          Account
                        </p>
                        <p className="text-xs text-gray-500 truncate" title={currentUser?.email}>
                          {currentUser?.email}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Menu Items */}
                  <div className="py-2">

                    {/* Logout */}
                    <button
                      onClick={() => {
                        logout();
                        setShowAccountMenu(false);
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-600 hover:bg-red-50 transition-colors border-t border-gray-100"
                    >
                      <LogOut size={18} />
                      <span className="font-medium">Logout</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

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
    </nav>
  );
}
