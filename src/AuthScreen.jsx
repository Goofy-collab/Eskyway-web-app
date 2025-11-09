import React, { useState } from 'react';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, updateProfile, sendPasswordResetEmail } from 'firebase/auth';
import { auth } from './firebase';

export default function AuthScreen() {
  const [isLogin, setIsLogin] = useState(true);
  const [isForgotPassword, setIsForgotPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const getErrorMessage = (errorCode) => {
    switch (errorCode) {
      case 'auth/invalid-email':
        return 'Please enter a valid email address.';
      case 'auth/user-disabled':
        return 'This account has been disabled. Please contact support.';
      case 'auth/user-not-found':
        return 'No account found with this email. Please sign up first.';
      case 'auth/wrong-password':
        return 'Incorrect password. Please try again.';
      case 'auth/email-already-in-use':
        return 'This email is already registered. Please sign in instead.';
      case 'auth/weak-password':
        return 'Password is too weak. Please use at least 6 characters.';
      case 'auth/operation-not-allowed':
        return 'Operation not allowed. Please contact support.';
      case 'auth/invalid-credential':
        return 'Invalid email or password. Please check your credentials and try again.';
      case 'auth/too-many-requests':
        return 'Too many unsuccessful attempts. Please try again later.';
      case 'auth/network-request-failed':
        return 'Network error. Please check your internet connection.';
      case 'auth/requires-recent-login':
        return 'Please log in again to complete this action.';
      case 'auth/missing-password':
        return 'Please enter a password.';
      case 'auth/missing-email':
        return 'Please enter an email address.';
      default:
        return 'An error occurred. Please try again.';
    }
  };

  const handlePasswordReset = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      await sendPasswordResetEmail(auth, email);
      setSuccessMessage('Password reset email sent! Please check your inbox.');
      setEmail('');
    } catch (err) {
      const errorCode = err.code;
      const friendlyMessage = getErrorMessage(errorCode);
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, { displayName: name });
      }

      setEmail('');
      setPassword('');
      setName('');
    } catch (err) {
      const errorCode = err.code;
      const friendlyMessage = getErrorMessage(errorCode);
      setError(friendlyMessage);
    } finally {
      setLoading(false);
    }
  };

  const switchView = (view) => {
    setError('');
    setSuccessMessage('');

    if (view === 'login') {
      setIsLogin(true);
      setIsForgotPassword(false);
    } else if (view === 'signup') {
      setIsLogin(false);
      setIsForgotPassword(false);
    } else if (view === 'forgot') {
      setIsForgotPassword(true);
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(to bottom right, #7c3aed, #22c55e)',
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1)',
        padding: '40px',
        width: '100%',
        maxWidth: '400px'
      }}>
        <div style={{ textAlign: 'center', marginBottom: '32px' }}>
          <h1 style={{
            fontSize: '32px',
            fontWeight: 'bold',
            margin: '0 0 8px 0'
          }}>
            <span style={{ color: '#7c3aed' }}>Esky</span>
            <span style={{ color: '#22c55e' }}>Way</span>
          </h1>

          <p style={{
            fontSize: '16px',
            color: '#6b7280',
            margin: 0
          }}>
            {isForgotPassword
              ? 'Reset your password'
              : isLogin
                ? 'Welcome back!'
                : 'Create your account'}
          </p>
        </div>

        {successMessage && (
          <div style={{
    backgroundColor: '#d1fae5',
    border: '1px solid #6ee7b7',
    color: '#065f46',
    padding: '12px',
    borderRadius: '8px',
    marginBottom: '20px',
    fontSize: '14px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px'
  }}>
    {successMessage}
  </div>
        )}

        {error && (
          <div style={{
            backgroundColor: '#fee2e2',
            border: '1px solid #fca5a5',
            color: '#991b1b',
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '20px',
            fontSize: '14px'
          }}>
             {error}
          </div>
        )}

        {isForgotPassword ? (
          <form onSubmit={handlePasswordReset}>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px'
                }}
              />
            </div>

            <button type="submit" disabled={loading} style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#9ca3af' : '#7c3aed',
              color: 'white',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}>
              {loading ? 'Sending...' : 'Send Reset Link'}
            </button>

            <div style={{ marginTop: '24px', textAlign: 'center' }}>
              Remember password?{' '}
              <button onClick={() => switchView('login')} style={{
                background: 'none',
                border: 'none',
                color: '#22c55e',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}>
                Sign in
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={handleSubmit}>
            {!isLogin && (
              <div style={{ marginBottom: '20px' }}>
                <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                  Full Name
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="John Doe"
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px'
                  }}
                />
              </div>
            )}

            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Email
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="your@email.com"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db'
                }}
              />
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', color: '#374151', marginBottom: '8px' }}>
                Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                placeholder="••••••••"
                style={{
                  width: '100%',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #d1d5db'
                }}
              />
            </div>

            {isLogin && (
              <div style={{ textAlign: 'right', marginBottom: '24px' }}>
                <button type="button" onClick={() => switchView('forgot')} style={{
                  background: 'none',
                  border: 'none',
                  color: '#7c3aed',
                  cursor: 'pointer'
                }}>
                  Forgot password?
                </button>
              </div>
            )}

            <button type="submit" disabled={loading} style={{
              width: '100%',
              padding: '12px',
              backgroundColor: loading ? '#9ca3af' : '#7c3aed',
              color: 'white',
              borderRadius: '8px',
              cursor: loading ? 'not-allowed' : 'pointer'
            }}>
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </button>

            <div style={{ marginTop: '24px', textAlign: 'center', fontSize: '14px', color: '#6b7280' }}>
              {isLogin ? "Don't have an account? " : "Already have an account? "}
              <button onClick={() => switchView(isLogin ? 'signup' : 'login')} style={{
                background: 'none',
                border: 'none',
                color: '#22c55e',
                textDecoration: 'underline',
                cursor: 'pointer'
              }}>
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
