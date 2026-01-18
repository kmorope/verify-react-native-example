# Twilio Verify React Native - Code Examples

This document provides detailed code examples for common use cases with the Twilio Verify SDK.

## Table of Contents

- [Basic Setup](#basic-setup)
- [Creating Factors](#creating-factors)
- [Verifying Factors](#verifying-factors)
- [Managing Factors](#managing-factors)
- [Handling Challenges](#handling-challenges)
- [Error Handling](#error-handling)

## Basic Setup

### Install Dependencies

```bash
npm install @twilio/twilio-verify-for-react-native
npm install @react-navigation/native @react-navigation/bottom-tabs
npm install react-native-screens react-native-safe-area-context
npm install @react-native-community/netinfo
npm install toastify-react-native
```

### Import Required Modules

```typescript
import TwilioVerify, {
  FactorType,
  PushFactorPayload,
  VerifyPushFactorPayload,
} from '@twilio/twilio-verify-for-react-native';
```

## Creating Factors

### 1. Check SDK Availability

Before creating factors, verify the SDK is available:

```typescript
const checkAvailability = async () => {
  try {
    const isAvailable = await TwilioVerify.isAvailable();

    if (isAvailable) {
      console.log('✓ Twilio Verify SDK is available');
    } else {
      console.log('✗ Twilio Verify SDK is not available');
    }

    return isAvailable;
  } catch (error) {
    console.error('Error checking availability:', error);
    return false;
  }
};
```

### 2. Fetch Access Token from Backend

```typescript
const fetchAccessToken = async (identity: string, backendUrl: string) => {
  try {
    const response = await fetch(backendUrl, {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ identity }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();

    // Validate response
    if (!data.token && !data.accessToken) {
      throw new Error('No access token in response');
    }

    if (!data.serviceSid || !data.serviceSid.startsWith('VA')) {
      throw new Error('Invalid or missing serviceSid');
    }

    return {
      accessToken: data.token || data.accessToken,
      serviceSid: data.serviceSid,
      identity: data.identity,
      pushToken: data.pushToken,
    };
  } catch (error) {
    console.error('Failed to fetch access token:', error);
    throw error;
  }
};
```

### 3. Create Push Factor

```typescript
const createPushFactor = async (
  friendlyName: string,
  serviceSid: string,
  identity: string,
  accessToken: string,
  pushToken: string,
) => {
  try {
    // Create the factor payload
    const factorPayload = new PushFactorPayload(
      friendlyName, // e.g., "My iPhone"
      serviceSid, // From your backend
      identity, // User identifier
      accessToken, // JWT from your backend
      pushToken, // FCM or APNS token
    );

    console.log('Creating factor...');

    // Create the factor
    const factor = await TwilioVerify.createFactor(factorPayload);

    console.log('Factor created:', {
      sid: factor.sid,
      status: factor.status,
      friendlyName: factor.friendlyName,
    });

    return factor;
  } catch (error) {
    console.error('Failed to create factor:', error);
    throw error;
  }
};
```

### 4. Complete Example: Create and Verify Factor

```typescript
const createAndVerifyFactor = async () => {
  const identity = 'user@example.com';
  const backendUrl = 'https://your-backend.com/access-token';

  try {
    // Step 1: Check availability
    const isAvailable = await TwilioVerify.isAvailable();
    if (!isAvailable) {
      throw new Error('Twilio Verify is not available');
    }

    // Step 2: Get access token from backend
    const tokenData = await fetchAccessToken(identity, backendUrl);

    // Step 3: Create the factor
    const factor = await createPushFactor(
      'My Phone',
      tokenData.serviceSid,
      tokenData.identity, // Use identity from backend
      tokenData.accessToken,
      tokenData.pushToken || `test-${Date.now()}`,
    );

    // Step 4: Verify the factor (for initial setup)
    const verifyPayload: VerifyPushFactorPayload = {
      sid: factor.sid,
      factorType: FactorType.Push,
    };

    const verifiedFactor = await TwilioVerify.verifyFactor(verifyPayload);

    console.log('✓ Factor verified:', verifiedFactor.sid);

    return verifiedFactor;
  } catch (error) {
    console.error('Error in createAndVerifyFactor:', error);
    throw error;
  }
};
```

## Managing Factors

### Get All Factors

```typescript
const getAllFactors = async () => {
  try {
    const factors = await TwilioVerify.getAllFactors();

    console.log(`Found ${factors.length} factors`);

    factors.forEach((factor, index) => {
      console.log(`Factor ${index + 1}:`, {
        sid: factor.sid,
        friendlyName: factor.friendlyName,
        status: factor.status,
        type: factor.type,
      });
    });

    return factors;
  } catch (error) {
    console.error('Failed to get factors:', error);
    return [];
  }
};
```

### Get a Specific Factor

```typescript
const getFactor = async (factorSid: string) => {
  try {
    const factor = await TwilioVerify.getFactor(factorSid);

    console.log('Factor details:', factor);

    return factor;
  } catch (error) {
    console.error('Failed to get factor:', error);
    throw error;
  }
};
```

### Delete a Factor

```typescript
const deleteFactor = async (factorSid: string) => {
  try {
    await TwilioVerify.deleteFactor(factorSid);

    console.log('✓ Factor deleted successfully');

    return true;
  } catch (error) {
    console.error('Failed to delete factor:', error);
    throw error;
  }
};
```

### Update Factor Name

```typescript
const updateFactorName = async (factorSid: string, newName: string) => {
  try {
    const updatedFactor = await TwilioVerify.updateFactor(factorSid, newName);

    console.log('✓ Factor name updated:', updatedFactor.friendlyName);

    return updatedFactor;
  } catch (error) {
    console.error('Failed to update factor:', error);
    throw error;
  }
};
```

## Handling Challenges

### Get All Pending Challenges

```typescript
const getPendingChallenges = async (factorSid: string) => {
  try {
    const challenges = await TwilioVerify.getAllChallenges(factorSid);

    console.log(`Found ${challenges.length} challenges`);

    const pending = challenges.filter(c => c.status === 'pending');
    console.log(`Pending: ${pending.length}`);

    return pending;
  } catch (error) {
    console.error('Failed to get challenges:', error);
    return [];
  }
};
```

### Approve a Challenge

```typescript
const approveChallenge = async (challengeSid: string, factorSid: string) => {
  try {
    await TwilioVerify.updateChallenge(challengeSid, factorSid, 'approved');

    console.log('✓ Challenge approved');

    return true;
  } catch (error) {
    console.error('Failed to approve challenge:', error);
    throw error;
  }
};
```

### Deny a Challenge

```typescript
const denyChallenge = async (challengeSid: string, factorSid: string) => {
  try {
    await TwilioVerify.updateChallenge(challengeSid, factorSid, 'denied');

    console.log('✓ Challenge denied');

    return true;
  } catch (error) {
    console.error('Failed to deny challenge:', error);
    throw error;
  }
};
```

## Verifying Factors

### Verify Factor After Creation

```typescript
const verifyNewFactor = async (factorSid: string) => {
  try {
    const verifyPayload: VerifyPushFactorPayload = {
      sid: factorSid,
      factorType: FactorType.Push,
    };

    const verifiedFactor = await TwilioVerify.verifyFactor(verifyPayload);

    console.log('✓ Factor verified successfully');
    console.log('Status:', verifiedFactor.status);

    return verifiedFactor;
  } catch (error) {
    console.error('Failed to verify factor:', error);
    throw error;
  }
};
```

## Error Handling

### Common Error Codes

```typescript
const handleTwilioError = (error: any) => {
  const errorCode = error.code;
  const errorMessage = error.message;

  switch (errorCode) {
    case 60401:
      console.error('Invalid credentials or configuration');
      console.error('Check: serviceSid, accessToken, identity, pushToken');
      break;

    case 60403:
      console.error('Forbidden - Check your Twilio account permissions');
      break;

    case 60404:
      console.error('Factor not found');
      break;

    case 60200:
      console.error('Invalid parameters');
      break;

    case 'EUNSPECIFIED':
      console.error('Unspecified error:', errorMessage);
      break;

    default:
      console.error('Unknown error:', errorCode, errorMessage);
  }

  return {
    code: errorCode,
    message: errorMessage,
  };
};
```

### Retry Logic

```typescript
const createFactorWithRetry = async (payload: any, maxRetries: number = 3) => {
  let lastError: any;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Attempt ${attempt}/${maxRetries}...`);

      const factor = await TwilioVerify.createFactor(payload);

      console.log('✓ Success on attempt', attempt);
      return factor;
    } catch (error) {
      console.error(`✗ Attempt ${attempt} failed:`, error);
      lastError = error;

      // Don't retry on certain errors
      if (error.code === 60403 || error.code === 60404) {
        throw error;
      }

      // Wait before retrying
      if (attempt < maxRetries) {
        const delay = 1000 * attempt; // Exponential backoff
        console.log(`Waiting ${delay}ms before retry...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
};
```

## Utility Functions

### Clear All Local Data

```typescript
const clearAllData = async () => {
  try {
    await TwilioVerify.clearLocalStorage();

    console.log('✓ Local storage cleared');

    return true;
  } catch (error) {
    console.error('Failed to clear storage:', error);
    throw error;
  }
};
```

### Check Network Connectivity

```typescript
import NetInfo from '@react-native-community/netinfo';

const checkNetwork = async () => {
  try {
    const state = await NetInfo.fetch();

    console.log('Network status:', {
      isConnected: state.isConnected,
      type: state.type,
      isInternetReachable: state.isInternetReachable,
    });

    return state.isConnected;
  } catch (error) {
    console.error('Failed to check network:', error);
    return false;
  }
};
```

### Generate Random Identity for Testing

```typescript
const generateTestIdentity = () => {
  const randomString = Math.random().toString(36).substring(2, 10);
  return `test_user_${randomString}`;
};

// Usage
const identity = generateTestIdentity();
console.log('Test identity:', identity); // e.g., "test_user_a7k3m9x2"
```

## React Component Example

### Complete Factor Management Component

```typescript
import React, { useState, useEffect } from 'react';
import { View, Button, Text, FlatList } from 'react-native';
import TwilioVerify from '@twilio/twilio-verify-for-react-native';

const FactorManager = () => {
  const [factors, setFactors] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadFactors();
  }, []);

  const loadFactors = async () => {
    setLoading(true);
    try {
      const allFactors = await TwilioVerify.getAllFactors();
      setFactors(allFactors);
    } catch (error) {
      console.error('Failed to load factors:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (sid: string) => {
    try {
      await TwilioVerify.deleteFactor(sid);
      await loadFactors(); // Refresh list
    } catch (error) {
      console.error('Failed to delete:', error);
    }
  };

  return (
    <View>
      <Button title="Refresh" onPress={loadFactors} disabled={loading} />

      <FlatList
        data={factors}
        keyExtractor={item => item.sid}
        renderItem={({ item }) => (
          <View>
            <Text>{item.friendlyName}</Text>
            <Text>{item.status}</Text>
            <Button title="Delete" onPress={() => handleDelete(item.sid)} />
          </View>
        )}
      />
    </View>
  );
};

export default FactorManager;
```

## Additional Resources

- [Twilio Verify API Reference](https://www.twilio.com/docs/verify/api)
- [React Native Push Notifications](https://rnfirebase.io/messaging/usage)
- [Twilio Console](https://console.twilio.com)

---

For more examples, check the [main README](./README.md) or explore the source code in [App.tsx](./App.tsx).
