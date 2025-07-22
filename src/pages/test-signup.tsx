import { useState } from 'react';
import { createClient } from '../utils/supabase/client';

export default function TestSignup() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState('');
  const supabase = createClient();

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setMessage('');

    try {
      console.log('🧪 TEST-SIGNUP: Starting signup process...');
      
      // Step 1: Create user with Supabase
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        setMessage(`Signup failed: ${error.message}`);
        setIsLoading(false);
        return;
      }

      console.log('🧪 TEST-SIGNUP: User created:', data.user?.email);
      setMessage('User created! Now auto-confirming...');

      // Step 2: Auto-confirm the user
      try {
        console.log('🧪 TEST-SIGNUP: Auto-confirming user...');
        const confirmResponse = await fetch('/api/auto-confirm-user', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email }),
        });

        const confirmResult = await confirmResponse.json();
        
        if (confirmResponse.ok) {
          console.log('🧪 TEST-SIGNUP: ✅ User auto-confirmed successfully');
          setMessage('✅ Account created and confirmed! You can now log in.');
          
          // Clear form
          setEmail('');
          setPassword('');
          setFullName('');
        } else {
          console.error('🧪 TEST-SIGNUP: ❌ Auto-confirm failed:', confirmResult);
          setMessage(`❌ Account created but auto-confirm failed: ${confirmResult.message}`);
        }
      } catch (confirmError) {
        console.error('🧪 TEST-SIGNUP: ❌ Error auto-confirming user:', confirmError);
        setMessage('❌ Account created but auto-confirm failed. Please check console for details.');
      }

    } catch (error) {
      console.error('🧪 TEST-SIGNUP: ❌ Signup error:', error);
      setMessage('❌ Signup failed. Please check console for details.');
    }

    setIsLoading(false);
  };

  const handleLogin = async () => {
    if (!email || !password) {
      setMessage('Please enter email and password to test login');
      return;
    }

    setIsLoading(true);
    setMessage('');

    try {
      console.log('🧪 TEST-LOGIN: Attempting login...');
      
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        console.error('🧪 TEST-LOGIN: ❌ Login failed:', error);
        setMessage(`❌ Login failed: ${error.message}`);
      } else {
        console.log('🧪 TEST-LOGIN: ✅ Login successful:', data.user?.email);
        setMessage('✅ Login successful! User is authenticated.');
      }
    } catch (error) {
      console.error('🧪 TEST-LOGIN: ❌ Login error:', error);
      setMessage('❌ Login error. Please check console for details.');
    }

    setIsLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-900 p-8">
      <div className="max-w-md mx-auto bg-gray-800 p-6 rounded-lg">
        <h1 className="text-2xl font-bold text-white mb-6">Test Auto-Confirm Signup</h1>
        
        <form onSubmit={handleSignup} className="space-y-4">
          <div>
            <label className="block text-white mb-2">Full Name</label>
            <input
              type="text"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 text-white"
              required
            />
          </div>
          
          <div>
            <label className="block text-white mb-2">Email</label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 text-white"
              required
            />
          </div>
          
          <div>
            <label className="block text-white mb-2">Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full p-2 rounded bg-gray-700 text-white"
              required
            />
          </div>
          
          <div className="flex gap-4">
            <button
              type="submit"
              disabled={isLoading}
              className="flex-1 bg-blue-600 text-white p-2 rounded hover:bg-blue-700 disabled:opacity-50"
            >
              {isLoading ? 'Creating...' : 'Create & Auto-Confirm'}
            </button>
            
            <button
              type="button"
              onClick={handleLogin}
              disabled={isLoading}
              className="flex-1 bg-green-600 text-white p-2 rounded hover:bg-green-700 disabled:opacity-50"
            >
              {isLoading ? 'Logging in...' : 'Test Login'}
            </button>
          </div>
        </form>
        
        {message && (
          <div className={`mt-4 p-3 rounded ${
            message.includes('✅') ? 'bg-green-900 text-green-200' : 'bg-red-900 text-red-200'
          }`}>
            {message}
          </div>
        )}
        
        <div className="mt-6 p-4 bg-gray-700 rounded">
          <h3 className="text-white font-semibold mb-2">How to test:</h3>
          <ol className="text-gray-300 text-sm space-y-1">
            <li>1. Fill in the form with a new email</li>
            <li>2. Click "Create & Auto-Confirm"</li>
            <li>3. Check console logs for detailed process</li>
            <li>4. Use "Test Login" to verify account works</li>
            <li>5. Check your email - should receive confirmation email but account should work without clicking it</li>
          </ol>
        </div>
      </div>
    </div>
  );
} 