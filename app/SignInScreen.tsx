import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';

interface SignInScreenProps {
  onSignIn: (email: string, password: string) => void;
  onToggleMode: () => void;
  isSignup: boolean;
}

export default function SignInScreen({ onSignIn, onToggleMode, isSignup }: SignInScreenProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  function handleSubmit() {
    if (!email || !password) {
      setError('Please enter both email and password');
      return;
    }
    setError(null);
    onSignIn(email, password);
  }

  return (
    <View style={styles.container}>
      <Text style={styles.heading}>{isSignup ? 'Sign Up' : 'Sign In'}</Text>
      <TextInput
        style={styles.input}
        placeholder="Email"
        value={email}
        onChangeText={setEmail}
        autoCapitalize="none"
        keyboardType="email-address"
      />
      <TextInput
        style={styles.input}
        placeholder="Password"
        value={password}
        onChangeText={setPassword}
        secureTextEntry
      />
      {error && <Text style={styles.error}>{error}</Text>}
      <TouchableOpacity style={styles.button} onPress={handleSubmit}>
        <Text style={styles.buttonText}>{isSignup ? 'Create Account' : 'Log In'}</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={onToggleMode}>
        <Text style={styles.link}>
          {isSignup ? 'Already have an account? Sign In' : "Don't have an account? Sign Up"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  heading: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 24,
    color: '#7c3aed',
  },
  input: {
    width: '100%',
    maxWidth: 320,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
    backgroundColor: '#f3f4f6',
  },
  button: {
    backgroundColor: '#7c3aed',
    borderRadius: 20,
    paddingVertical: 12,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 12,
  },
  buttonText: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 16,
  },
  link: {
    color: '#7c3aed',
    textDecorationLine: 'underline',
    fontSize: 15,
    marginTop: 8,
  },
  error: {
    color: 'red',
    marginBottom: 12,
  },
}); 