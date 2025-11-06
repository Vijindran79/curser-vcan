import React, { useState } from 'react';
import { getAuth, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink } from 'firebase/auth';
import { app } from '../firebase';

export default function SimpleLogin() {
  const [email, setEmail] = useState('');
  const [message, setMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const auth = getAuth(app);

  // Check if user clicked email link
  React.useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      
      if (!email) {
        email = window.prompt('Please enter your email to complete sign-in:');
      }
      
      if (email) {
        completeSignIn(email);
      }
    }
  }, []);

  const completeSignIn = async (email: string) => {
    try {
      const result = await signInWithEmailLink(auth, email, window.location.href);
      window.localStorage.removeItem('emailForSignIn');
      
      // Log successful sign-in
      console.log('User signed in successfully:', result.user.email);
      
      // Update user profile if needed
      if (!result.user.emailVerified) {
        await result.user.updateProfile({
          emailVerified: true
        });
      }
      
      window.location.href = '/#/dashboard';
    } catch (error: any) {
      console.error('Sign-in error:', error);
      setMessage(
        error.code === 'auth/invalid-action-code'
          ? 'This login link has expired. Please request a new one.'
          : error.code === 'auth/invalid-email'
          ? 'Invalid email address. Please check and try again.'
          : 'Sign-in failed. Please try again.'
      );
    }
  };

  const sendMagicLink = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');

    if (!email.match(/^[^\s@]+@[^\s@]+\.[^\s@]+$/)) {
      setMessage('❌ Please enter a valid email address.');
      setLoading(false);
      return;
    }

    const actionCodeSettings = {
      url: window.location.origin + window.location.pathname,
      handleCodeInApp: true,
      iOS: {
        bundleId: 'com.vcanship.app'
      },
      android: {
        packageName: 'com.vcanship.app',
        installApp: true
      }
    };

    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      console.log('Magic link sent successfully to:', email);
      setMessage(`✅ Magic link sent! Check your email (${email}) and click the link. Don't forget to check your spam folder!`);
    } catch (error: any) {
      console.error('Error sending magic link:', error);
      setMessage(
        error.code === 'auth/invalid-email'
          ? '❌ Invalid email address. Please check and try again.'
          : error.code === 'auth/operation-not-allowed'
          ? '❌ Email/password sign-in is not enabled. Please contact support.'
          : '❌ Failed to send email. Please try again later.'
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ maxWidth: '400px', margin: '50px auto', padding: '20px', textAlign: 'center' }}>
      <h2>Welcome Back!</h2>
      <p>Enter your email to get a magic login link</p>
      
      <form onSubmit={sendMagicLink}>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="your@email.com"
          required
          style={{
            width: '100%',
            padding: '12px',
            margin: '10px 0',
            border: '1px solid #ddd',
            borderRadius: '4px'
          }}
        />
        <button
          type="submit"
          disabled={loading}
          style={{
            width: '100%',
            padding: '12px',
            background: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: loading ? 'not-allowed' : 'pointer'
          }}
        >
          {loading ? 'Sending...' : 'Send Magic Link'}
        </button>
      </form>

      {message && (
        <div style={{ marginTop: '20px', padding: '10px', background: '#f8f9fa', borderRadius: '4px' }}>
          {message}
        </div>
      )}

      <div style={{ marginTop: '20px', fontSize: '14px', color: '#666' }}>
        <p>💡 <strong>Tip:</strong> Check your spam folder if you don't see the email!</p>
      </div>
    </div>
  );
}