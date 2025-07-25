import React, { useState } from 'react';
import SignInScreen from './SignInScreen';
import HomeScreen from './HomeScreen';

export default function App() {
  const [user, setUser] = useState<null | { email: string }>(null);
  const [isSignup, setIsSignup] = useState(false);

  function handleSignIn(email: string, password: string) {
    // TODO: Replace with real auth logic
    setUser({ email });
  }

  function handleSignOut() {
    setUser(null);
  }

  if (!user) {
    return (
      <SignInScreen
        onSignIn={handleSignIn}
        onToggleMode={() => setIsSignup(s => !s)}
        isSignup={isSignup}
      />
    );
  }

  return <HomeScreen />;
} 