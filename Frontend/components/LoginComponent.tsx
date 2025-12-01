import React, { useState } from 'react';
import { REQUIRED_EMAIL_DOMAIN } from '../constants';
import { apiRegister, apiLogin } from '../services/apiService';
import { User, Role } from '../types';

interface LoginComponentProps {
  onLogin: (user: User) => void;
  role: Role;
  onBack: () => void;
}

const LoginComponent: React.FC<LoginComponentProps> = ({ onLogin, role, onBack }) => {
  const [isSigningUp, setIsSigningUp] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const validateEmail = (email: string): boolean => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email) && email.length <= 255;
  };

  const validatePassword = (password: string): boolean => {
    // At least 6 characters, max 128, 1 uppercase, 1 lowercase, 1 number
    if (password.length < 6 || password.length > 128) {
      return false;
    }
    const passwordRegex = /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)/;
    return passwordRegex.test(password);
  };

  const validateName = (name: string): boolean => {
    const trimmedName = name.trim();
    if (trimmedName.length < 2 || trimmedName.length > 100) {
      return false;
    }
    // Only allow letters, spaces, and common name characters
    const nameRegex = /^[a-zA-Z\s.'-]+$/;
    return nameRegex.test(trimmedName);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      // Email validation
      if (!validateEmail(email)) {
        setError('Please enter a valid email address.');
        setIsLoading(false);
        return;
      }

      if (!email.endsWith(`@${REQUIRED_EMAIL_DOMAIN}`)) {
        setError(`Access is restricted to @${REQUIRED_EMAIL_DOMAIN} domain.`);
        setIsLoading(false);
        return;
      }

      if (isSigningUp) {
        // Sign up validations
        const trimmedName = name.trim();
        
        if (trimmedName.length < 2) {
          setError('Please enter your full name (at least 2 characters).');
          setIsLoading(false);
          return;
        }

        if (trimmedName.length > 100) {
          setError('Name cannot exceed 100 characters.');
          setIsLoading(false);
          return;
        }

        if (!validateName(trimmedName)) {
          setError('Name can only contain letters, spaces, and common name characters (. \' -).');
          setIsLoading(false);
          return;
        }

        if (password.length > 128) {
          setError('Password cannot exceed 128 characters.');
          setIsLoading(false);
          return;
        }

        if (!validatePassword(password)) {
          setError('Password must be 6-128 characters and contain at least one uppercase letter, one lowercase letter, and one number.');
          setIsLoading(false);
          return;
        }

        if (password !== confirmPassword) {
          setError('Passwords do not match.');
          setIsLoading(false);
          return;
        }

        // Register user via API
        const { user } = await apiRegister(trimmedName, email, password, role);
        onLogin(user);
      } else {
        // Login validations
        if (!password) {
          setError('Please enter your password.');
          setIsLoading(false);
          return;
        }

        // Login user via API
        const { user } = await apiLogin(email, password);
        
        // Check if role matches
        if (user.role !== role) {
          setError(`This email is registered as a ${user.role}. Please go back and select the correct role to sign in.`);
          setIsLoading(false);
          return;
        }

        onLogin(user);
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
      setIsLoading(false);
    }
  };

  const toggleMode = () => {
    setIsSigningUp(!isSigningUp);
    setError('');
    setName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
  };

  const roleName = role.charAt(0).toUpperCase() + role.slice(1);

  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="w-full max-w-md p-8 space-y-6 bg-gray-800 rounded-lg shadow-lg relative">
        <button 
            onClick={onBack} 
            className="absolute top-4 left-4 text-gray-400 hover:text-white transition-colors p-2 rounded-full hover:bg-gray-700"
            aria-label="Go back to role selection"
        >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
        </button>
        <h1 className="text-3xl font-bold text-center text-indigo-400 pt-8">
          {roleName} {isSigningUp ? 'Sign Up' : 'Sign In'}
        </h1>
        <p className="text-center text-gray-400">
          {isSigningUp ? `Create your ${roleName} account.` : `Sign in to your ${roleName} account.`}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          {isSigningUp && (
            <div>
              <label htmlFor="name" className="text-sm font-medium text-gray-300">
                Full Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                autoComplete="name"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g., Ada Lovelace"
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}
          <div>
            <label htmlFor="email" className="text-sm font-medium text-gray-300">
              Email address
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder={role === Role.Student ? `enrollment@${REQUIRED_EMAIL_DOMAIN}` : `yourname@${REQUIRED_EMAIL_DOMAIN}`}
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
           <div>
            <label htmlFor="password" className="text-sm font-medium text-gray-300">
              Password
            </label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete={isSigningUp ? "new-password" : "current-password"}
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>
           {isSigningUp && (
            <div>
              <label htmlFor="confirm-password" className="text-sm font-medium text-gray-300">
                Confirm Password
              </label>
              <input
                id="confirm-password"
                name="confirm-password"
                type="password"
                autoComplete="new-password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="••••••••"
                className="mt-1 block w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-indigo-500 focus:border-indigo-500"
              />
            </div>
          )}

          {error && <p className="text-sm text-red-400 text-center">{error}</p>}
          
          <div className="pt-2">
            <button
              type="submit"
              disabled={isLoading}
              className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-800 focus:ring-indigo-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isLoading ? (
                <span className="flex items-center">
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  {isSigningUp ? 'Creating Account...' : 'Signing In...'}
                </span>
              ) : (
                <span>{isSigningUp ? 'Create Account' : 'Sign In'}</span>
              )}
            </button>
          </div>
        </form>
        <div className="text-center text-sm">
          <button onClick={toggleMode} className="font-medium text-indigo-400 hover:text-indigo-300">
            {isSigningUp ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
          </button>
        </div>
      </div>
    </div>
  );
};

export default LoginComponent;