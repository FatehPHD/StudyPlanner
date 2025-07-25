import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';

export default function HomeScreen() {
  return (
    <View style={styles.container}>
      <Text style={styles.heading}>Welcome to StudyPlanner!</Text>
      <Text style={styles.subheading}>Your playful mobile to-do app 🎉</Text>
      {/* Placeholder for to-dos */}
      <View style={styles.todoCard}>
        <Text style={styles.todoText}>No to-dos yet. Enjoy your day!</Text>
      </View>
      <TouchableOpacity style={styles.button}>
        <Text style={styles.buttonText}>Add New To-Do</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24, backgroundColor: '#fff' },
  heading: { fontSize: 28, fontWeight: 'bold', color: '#7c3aed', marginBottom: 8 },
  subheading: { fontSize: 18, color: '#888', marginBottom: 24 },
  todoCard: { backgroundColor: '#f3f4f6', borderRadius: 12, padding: 16, marginBottom: 16, width: '100%', maxWidth: 320 },
  todoText: { fontSize: 16, color: '#222' },
  button: { backgroundColor: '#7c3aed', borderRadius: 20, paddingVertical: 12, paddingHorizontal: 32, alignItems: 'center', marginTop: 12 },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 16 },
}); 