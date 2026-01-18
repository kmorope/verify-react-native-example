/**
 * Twilio Verify React Native Example App
 *
 * This app demonstrates how to use the Twilio Verify SDK for React Native
 * to implement two-factor authentication (2FA) with push notifications.
 *
 * Features:
 * - Create and verify push factors
 * - List and manage all factors
 * - Delete factors
 * - Network connectivity monitoring
 *
 * @format
 */

import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  useColorScheme,
  View,
  TextInput,
  Button,
  Alert,
  Text,
  ScrollView,
  TouchableOpacity,
  FlatList,
  StatusBar,
} from 'react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import TwilioVerify, {
  FactorType,
  PushFactorPayload,
  VerifyPushFactorPayload,
} from '@twilio/twilio-verify-for-react-native';
import { Toast } from 'toastify-react-native';
import NetInfo from '@react-native-community/netinfo';

const Tab = createBottomTabNavigator();

function App() {
  const isDarkMode = useColorScheme() === 'dark';

  return (
    <SafeAreaProvider>
      <NavigationContainer>
        <StatusBar barStyle={isDarkMode ? 'light-content' : 'dark-content'} />
        <Tab.Navigator
          screenOptions={{
            tabBarActiveTintColor: '#007AFF',
            tabBarInactiveTintColor: '#8E8E93',
          }}
        >
          <Tab.Screen
            name="Create"
            component={CreateFactorScreen}
            options={{ title: 'Create Factor' }}
          />
          <Tab.Screen
            name="Factors"
            component={FactorsListScreen}
            options={{ title: 'Manage Factors' }}
          />
        </Tab.Navigator>
      </NavigationContainer>
    </SafeAreaProvider>
  );
}

// Network Status Component
function NetworkIndicator() {
  const [isConnected, setIsConnected] = useState<boolean | null>(true);

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener(state => {
      setIsConnected(state.isConnected);
    });

    NetInfo.fetch().then(state => {
      setIsConnected(state.isConnected);
    });

    return () => unsubscribe();
  }, []);

  return (
    <View style={styles.networkIndicator}>
      <View
        style={[
          styles.networkDot,
          { backgroundColor: isConnected ? '#34C759' : '#FF3B30' },
        ]}
      />
      <Text style={styles.networkText}>
        Network: {isConnected ? 'Ok' : 'Not Connected'}
      </Text>
    </View>
  );
}

// Create Factor Screen
function CreateFactorScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const [identity, setIdentity] = useState('');
  const [factorSid, setFactorSid] = useState('');
  const [loading, setLoading] = useState(false);
  const [accessTokenUrl, setAccessTokenUrl] = useState<string>('');

  const generateRandomIdentity = () => {
    const randomText = Math.random().toString(36).substring(2, 10);
    setIdentity(`user_${randomText}`);
    Toast.success(`Random identity generated: user_${randomText}`);
  };

  const createFactor = async () => {
    if (!identity) {
      Toast.error('Please enter an identity');
      return;
    }

    if (!accessTokenUrl) {
      Toast.error('Please enter an access token URL');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch(accessTokenUrl, {
        method: 'POST',
        headers: {
          Accept: 'application/json',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          identity: identity,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch access token: ${response.status}`);
      }

      const data = await response.json();
      console.log('Full server response:', JSON.stringify(data, null, 2));

      const accessToken = data.accessToken || data.token;

      if (!accessToken) {
        throw new Error('Access token not found in response');
      }

      if (!data.serviceSid) {
        throw new Error('Service SID not found in response');
      }

      if (!data.serviceSid.startsWith('VA')) {
        throw new Error(
          `Invalid serviceSid format: ${data.serviceSid}. It should start with 'VA'`,
        );
      }

      const pushToken = data.pushToken || `test-token-${Date.now()}`;

      const factorPayload = new PushFactorPayload(
        `${identity}'s factor`,
        data.serviceSid,
        data.identity,
        accessToken,
        pushToken,
      );

      let factor = await TwilioVerify.createFactor(factorPayload);
      console.log('Factor created successfully:', factor);

      const verifyPayload: VerifyPushFactorPayload = {
        sid: factor.sid,
        factorType: FactorType.Push,
      };
      factor = await TwilioVerify.verifyFactor(verifyPayload);

      setFactorSid(factor.sid);
      Toast.success('Verification factor created successfully');
    } catch (error: any) {
      console.error('Full error object:', error);

      let errorMessage = 'Failed to create factor';
      if (error.message) {
        errorMessage += `: ${error.message}`;
      }

      Toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const checkAvailability = async () => {
    setLoading(true);
    try {
      const isAvailable = await TwilioVerify.isAvailable();
      Alert.alert(
        'Availability Check',
        isAvailable
          ? 'TwilioVerify is available ✓'
          : 'TwilioVerify is not available ✗',
      );
    } catch (error) {
      Alert.alert('Error', `Failed to check availability: ${error}`);
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  const clearLocalStorage = async () => {
    try {
      await TwilioVerify.clearLocalStorage();
      Alert.alert('Success', 'Local storage cleaned successfully');
    } catch (error) {
      Alert.alert('Error', `Failed to clean local storage: ${error}`);
      console.error(error);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { paddingTop: safeAreaInsets.top + 10 }]}
    >
      <NetworkIndicator />

      <Text style={styles.title}>Create Factor</Text>

      <View style={styles.inputContainer}>
        <TextInput
          style={styles.inputWithButton}
          placeholder="Enter identity (e.g., username, email, or phone)"
          value={identity}
          onChangeText={setIdentity}
          autoCapitalize="none"
          editable={!loading}
        />
        <TouchableOpacity
          style={styles.randomButton}
          onPress={generateRandomIdentity}
          disabled={loading}
        >
          <Text style={styles.randomIcon}>🎲</Text>
        </TouchableOpacity>
      </View>

      <TextInput
        style={styles.input}
        placeholder="Access Token URL"
        value={accessTokenUrl}
        onChangeText={setAccessTokenUrl}
        autoCapitalize="none"
        editable={!loading}
      />

      <Button
        title={loading ? 'Processing...' : 'Create Verification Factor'}
        onPress={createFactor}
        disabled={loading}
      />

      {factorSid && (
        <View style={styles.successBox}>
          <Text style={styles.successTitle}>✓ Factor Created</Text>
          <Text style={styles.successSid}>{factorSid}</Text>
        </View>
      )}

      <View style={styles.actionsSection}>
        <Text style={styles.sectionTitle}>Other Actions</Text>

        <Button
          title={loading ? 'Checking...' : 'Check Availability'}
          onPress={checkAvailability}
          disabled={loading}
          color="#007AFF"
        />

        <View style={{ marginTop: 8 }} />

        <Button
          title="Clean Local Storage"
          onPress={clearLocalStorage}
          disabled={loading}
          color="#FF3B30"
        />
      </View>
    </ScrollView>
  );
}

// Factors List Screen
function FactorsListScreen() {
  const safeAreaInsets = useSafeAreaInsets();
  const [factors, setFactors] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFactor, setSelectedFactor] = useState<any>(null);
  const [refreshing, setRefreshing] = useState(false);

  const loadFactors = async () => {
    try {
      const allFactors = await TwilioVerify.getAllFactors();
      setFactors(allFactors);
      console.log('Loaded factors:', allFactors);
    } catch (error) {
      console.error('Failed to load factors:', error);
      Toast.error('Failed to load factors');
    }
  };

  useEffect(() => {
    loadFactors();
  }, []);

  const handleRefresh = async () => {
    setRefreshing(true);
    await loadFactors();
    setRefreshing(false);
    Toast.success('Factors refreshed');
  };

  const deleteFactor = async (sid: string) => {
    Alert.alert(
      'Delete Factor',
      'Are you sure you want to delete this factor?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setLoading(true);
            try {
              await TwilioVerify.deleteFactor(sid);
              Toast.success('Factor deleted successfully');
              await loadFactors();
              if (selectedFactor?.sid === sid) {
                setSelectedFactor(null);
              }
            } catch (error) {
              Toast.error(`Failed to delete factor: ${error}`);
              console.error(error);
            } finally {
              setLoading(false);
            }
          },
        },
      ],
    );
  };

  const renderFactorItem = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={[
        styles.factorCard,
        selectedFactor?.sid === item.sid && styles.factorCardSelected,
      ]}
      onPress={() => setSelectedFactor(item)}
    >
      <View style={styles.factorHeader}>
        <Text style={styles.factorName}>
          {item.friendlyName || 'Unnamed Factor'}
        </Text>
        <TouchableOpacity
          style={styles.deleteButton}
          onPress={() => deleteFactor(item.sid)}
          disabled={loading}
        >
          <Text style={styles.deleteButtonText}>Delete</Text>
        </TouchableOpacity>
      </View>
      <Text style={styles.factorSid}>SID: {item.sid}</Text>
      <Text style={styles.factorStatus}>Status: {item.status}</Text>
      <Text style={styles.factorType}>Type: {item.type}</Text>
    </TouchableOpacity>
  );

  return (
    <View style={[styles.container, { paddingTop: safeAreaInsets.top + 10 }]}>
      <NetworkIndicator />

      <View style={styles.header}>
        <Text style={styles.title}>Factors ({factors.length})</Text>
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={handleRefresh}
          disabled={refreshing}
        >
          <Text style={styles.refreshButtonText}>
            {refreshing ? '↻' : '↻ Refresh'}
          </Text>
        </TouchableOpacity>
      </View>

      {factors.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={styles.emptyStateText}>No factors found</Text>
          <Text style={styles.emptyStateSubtext}>
            Create a factor in the "Create Factor" tab
          </Text>
        </View>
      ) : (
        <FlatList
          data={factors}
          renderItem={renderFactorItem}
          keyExtractor={item => item.sid}
          refreshing={refreshing}
          onRefresh={handleRefresh}
          contentContainerStyle={styles.listContainer}
        />
      )}

      {selectedFactor && (
        <View style={styles.detailsPanel}>
          <Text style={styles.detailsTitle}>Factor Details</Text>
          <ScrollView>
            <Text style={styles.detailsLabel}>Friendly Name:</Text>
            <Text style={styles.detailsValue}>
              {selectedFactor.friendlyName || 'N/A'}
            </Text>

            <Text style={styles.detailsLabel}>SID:</Text>
            <Text style={styles.detailsValue}>{selectedFactor.sid}</Text>

            <Text style={styles.detailsLabel}>Status:</Text>
            <Text style={styles.detailsValue}>{selectedFactor.status}</Text>

            <Text style={styles.detailsLabel}>Type:</Text>
            <Text style={styles.detailsValue}>{selectedFactor.type}</Text>

            <Text style={styles.detailsLabel}>Created At:</Text>
            <Text style={styles.detailsValue}>
              {selectedFactor.createdAt || 'N/A'}
            </Text>
          </ScrollView>

          <TouchableOpacity
            style={styles.closeButton}
            onPress={() => setSelectedFactor(null)}
          >
            <Text style={styles.closeButtonText}>Close</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  input: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    fontSize: 16,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  inputWithButton: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginRight: 8,
  },
  randomButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    padding: 12,
    justifyContent: 'center',
    alignItems: 'center',
    width: 48,
    height: 48,
  },
  randomIcon: {
    fontSize: 24,
  },
  networkIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16,
    padding: 8,
    backgroundColor: '#f0f0f0',
    borderRadius: 8,
  },
  networkDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 8,
  },
  networkText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#333',
  },
  actionsSection: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  successBox: {
    backgroundColor: '#E8F5E9',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    borderLeftWidth: 4,
    borderLeftColor: '#34C759',
  },
  successTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#2E7D32',
    marginBottom: 8,
  },
  successSid: {
    fontSize: 12,
    color: '#666',
    fontFamily: 'monospace',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  refreshButton: {
    padding: 8,
  },
  refreshButtonText: {
    color: '#007AFF',
    fontSize: 16,
    fontWeight: '600',
  },
  listContainer: {
    paddingBottom: 20,
  },
  factorCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  factorCardSelected: {
    borderColor: '#007AFF',
    borderWidth: 2,
  },
  factorHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  factorName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  deleteButton: {
    backgroundColor: '#FF3B30',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  deleteButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  factorSid: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
    fontFamily: 'monospace',
  },
  factorStatus: {
    fontSize: 14,
    color: '#34C759',
    marginTop: 4,
    fontWeight: '500',
  },
  factorType: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
  },
  detailsPanel: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: '#fff',
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    padding: 20,
    maxHeight: '50%',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  detailsTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    textAlign: 'center',
  },
  detailsLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 12,
  },
  detailsValue: {
    fontSize: 16,
    color: '#333',
    marginTop: 4,
  },
  closeButton: {
    backgroundColor: '#007AFF',
    padding: 12,
    borderRadius: 8,
    marginTop: 16,
    alignItems: 'center',
  },
  closeButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});

export default App;
