import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator, NativeStackScreenProps } from '@react-navigation/native-stack';
import { SafeAreaProvider } from 'react-native-safe-area-context';

// Navigation parameter list type definition
export type RootStackParamList = {
  Home: undefined;
  Detail: { locationId: number; locationName: string };
};

type HomeScreenProps = NativeStackScreenProps<RootStackParamList, 'Home'>;
type DetailScreenProps = NativeStackScreenProps<RootStackParamList, 'Detail'>;

// 1. Initial HomeScreen Component
function HomeScreen({ navigation }: HomeScreenProps) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>EcoMonitor 🌿</Text>
      <Text style={styles.subtitle}>Air & Water Quality Monitoring</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Station Overview</Text>
        <Text style={styles.cardDescription}>
          Welcome to the EcoTrack telemetry dashboard. Tap below to test navigation to the Detail Screen.
        </Text>

        <TouchableOpacity
          style={styles.button}
          onPress={() =>
            navigation.navigate('Detail', {
              locationId: 1,
              locationName: 'Central City Park',
            })
          }
        >
          <Text style={styles.buttonText}>View Station Details ➔</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

// 2. Initial DetailScreen Component
function DetailScreen({ route, navigation }: DetailScreenProps) {
  const { locationId, locationName } = route.params;

  return (
    <View style={styles.container}>
      <Text style={styles.title}>{locationName}</Text>
      <Text style={styles.subtitle}>Location ID: #{locationId}</Text>

      <View style={styles.card}>
        <Text style={styles.cardTitle}>Real-time Telemetry</Text>
        <Text style={styles.cardDescription}>
          Navigation successfully configured! In Feature 4, we will fetch and render live AQI & WQI scores here.
        </Text>

        <TouchableOpacity style={styles.secondaryButton} onPress={() => navigation.goBack()}>
          <Text style={styles.secondaryButtonText}>⬅ Back to Home</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const Stack = createNativeStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle="light-content" backgroundColor="#0F172A" />
        <Stack.Navigator
          initialRouteName="Home"
          screenOptions={{
            headerStyle: {
              backgroundColor: '#1E293B',
            },
            headerTintColor: '#F8FAFC',
            headerTitleStyle: {
              fontWeight: 'bold',
            },
            contentStyle: {
              backgroundColor: '#0F172A',
            },
          }}
        >
          <Stack.Screen
            name="Home"
            component={HomeScreen}
            options={{ title: 'EcoMonitor 🌿' }}
          />
          <Stack.Screen
            name="Detail"
            component={DetailScreen}
            options={({ route }) => ({ title: route.params.locationName })}
          />
        </Stack.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#0F172A',
    justifyContent: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#F8FAFC',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: '#94A3B8',
    marginBottom: 24,
  },
  card: {
    backgroundColor: '#1E293B',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#334155',
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#38BDF8',
    marginBottom: 8,
  },
  cardDescription: {
    fontSize: 14,
    color: '#CBD5E1',
    lineHeight: 20,
    marginBottom: 20,
  },
  button: {
    backgroundColor: '#0284C7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  buttonText: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 14,
  },
  secondaryButton: {
    backgroundColor: '#334155',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  secondaryButtonText: {
    color: '#F8FAFC',
    fontWeight: '600',
    fontSize: 14,
  },
});
