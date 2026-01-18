# Twilio Verify React Native Example App

A comprehensive example application demonstrating how to integrate and use [Twilio Verify Push](https://www.twilio.com/docs/verify/push) in React Native for implementing secure two-factor authentication (2FA).

## 📱 Features

### Create Factor Tab

- ✅ Create push verification factors with Twilio Verify
- ✅ Random identity generator for quick testing
- ✅ Network connectivity indicator
- ✅ Automatic factor verification
- ✅ Check SDK availability
- ✅ Clear local storage

### Manage Factors Tab

- ✅ List all registered factors
- ✅ Pull-to-refresh factor list
- ✅ View detailed factor information
- ✅ Delete factors with confirmation
- ✅ Interactive factor selection

## 🚀 Prerequisites

Before running this app, you need:

1. **Twilio Account**: Sign up at [twilio.com](https://www.twilio.com)
2. **Twilio Verify Service**: Create a Verify service in the [Twilio Console](https://console.twilio.com/us1/develop/verify/services)
3. **Backend Server**: A server endpoint that generates Twilio Access Tokens
4. **React Native Environment**: Set up according to [React Native docs](https://reactnative.dev/docs/environment-setup)

## 📦 Installation

1. **Clone and install dependencies:**

```bash
cd verify-react-native-example
npm install
```

2. **Install iOS dependencies (iOS only):**

```bash
cd ios && pod install && cd ..
```

3. **Run the app:**

```bash
# Android
npx react-native run-android

# iOS
npx react-native run-ios
```

## 🔧 Configuration

### 1. Backend Server Setup

Your backend must provide an endpoint that:

- Accepts a POST request with `{ identity: string }`
- Returns a JSON response with:

```json
{
  "token": "eyJ...", // Twilio Access Token (JWT)
  "serviceSid": "VAxxxxx", // Your Verify Service SID
  "identity": "hashed_value", // User identity (can be hashed)
  "factorType": "push"
}
```

### 2. Update Access Token URL

In the app, update the default URL in `CreateFactorScreen`:

```typescript
const [accessTokenUrl, setAccessTokenUrl] = useState<string>(
  'https://your-backend.com/access-token', // Update this
);
```

### 3. Generate Access Tokens (Backend)

Example Node.js backend code:

```javascript
const twilio = require('twilio');
const AccessToken = twilio.jwt.AccessToken;
const VoiceGrant = AccessToken.VoiceGrant;

app.post('/access-token', (req, res) => {
  const { identity } = req.body;

  // Create access token
  const token = new AccessToken(
    process.env.TWILIO_ACCOUNT_SID,
    process.env.TWILIO_API_KEY,
    process.env.TWILIO_API_SECRET,
    { identity },
  );

  // Add Verify grant
  const grant = new VoiceGrant({
    pushCredentialSid: process.env.PUSH_CREDENTIAL_SID, // Optional
  });
  token.addGrant(grant);

  res.json({
    token: token.toJwt(),
    serviceSid: process.env.VERIFY_SERVICE_SID,
    identity: identity,
    factorType: 'push',
  });
});
```

## 📖 Usage Guide

### Creating a Factor

1. Navigate to the **Create Factor** tab
2. Click the 🎲 button to generate a random identity (or enter your own)
3. Verify the Access Token URL is correct
4. Press **Create Verification Factor**
5. The factor will be created and verified automatically

### Managing Factors

1. Navigate to the **Manage Factors** tab
2. See all registered factors with their status
3. Tap any factor to view detailed information
4. Use the **Delete** button to remove a factor
5. Pull down to refresh the factor list

## 🔑 Key API Methods Used

### Initialize and Check Availability

```typescript
const isAvailable = await TwilioVerify.isAvailable();
```

### Create a Push Factor

```typescript
import {
  PushFactorPayload,
  FactorType,
} from '@twilio/twilio-verify-for-react-native';

const factorPayload = new PushFactorPayload(
  'My Phone', // Friendly name
  serviceSid, // Service SID from backend
  identity, // User identity
  accessToken, // JWT token from backend
  pushToken, // FCM/APNS token
);

const factor = await TwilioVerify.createFactor(factorPayload);
```

### Verify a Factor

```typescript
import { VerifyPushFactorPayload } from '@twilio/twilio-verify-for-react-native';

const verifyPayload: VerifyPushFactorPayload = {
  sid: factor.sid,
  factorType: FactorType.Push,
};

const verifiedFactor = await TwilioVerify.verifyFactor(verifyPayload);
```

### Get All Factors

```typescript
const factors = await TwilioVerify.getAllFactors();
console.log('All factors:', factors);
```

### Delete a Factor

```typescript
await TwilioVerify.deleteFactor(factorSid);
```

### Clear Local Storage

```typescript
await TwilioVerify.clearLocalStorage();
```

## 🏗️ Architecture

### Component Structure

```
App
├── NavigationContainer
└── Tab.Navigator
    ├── CreateFactorScreen (Create Factor Tab)
    │   ├── NetworkIndicator
    │   ├── Identity Input with Random Generator
    │   ├── Access Token URL Input
    │   ├── Create Factor Button
    │   └── Actions Section
    └── FactorsListScreen (Manage Factors Tab)
        ├── NetworkIndicator
        ├── Factor List (FlatList)
        │   └── FactorCard (TouchableOpacity)
        └── DetailsPanel (Factor Details)
```

### State Management

- Local component state with React hooks (`useState`, `useEffect`)
- Network state with `@react-native-community/netinfo`
- Navigation with React Navigation bottom tabs

## 🐛 Troubleshooting

### Error 60401: Exception while calling the API

**Causes:**

- Invalid `serviceSid` (must start with "VA")
- Incorrect or expired `accessToken`
- Mismatched `identity` between token and request
- Invalid `pushToken` (must be real FCM/APNS token for production)

**Solution:**

1. Verify your backend returns the correct `serviceSid`
2. Ensure the `identity` in the token matches the one used to create the factor
3. Use `data.identity` from backend response (not the input identity)
4. For production, implement Firebase Cloud Messaging (FCM) or Apple Push Notification Service (APNS)

### Network Issues

The app includes a network indicator at the top:

- 🟢 **Green**: Connected
- 🔴 **Red**: Not Connected

Ensure you have an active internet connection before creating factors.

### Factor Creation Fails

Check the console logs for detailed error information:

- `Full server response:` - Shows what your backend returned
- `About to create factor with:` - Shows the parameters being sent to Twilio

## 📚 Additional Resources

- [Twilio Verify Push Documentation](https://www.twilio.com/docs/verify/push)
- [Twilio Verify React Native SDK](https://github.com/twilio/twilio-verify-for-react-native)
- [Twilio Access Tokens](https://www.twilio.com/docs/iam/access-tokens)
- [React Navigation](https://reactnavigation.org/)

## 🔐 Security Best Practices

1. **Never hardcode credentials** in your React Native app
2. **Always generate Access Tokens on your backend** server
3. **Validate user identity** on the backend before issuing tokens
4. **Use HTTPS** for all backend communications
5. **Implement proper authentication** before allowing factor creation
6. **Rotate API keys regularly** in your Twilio account
7. **Monitor usage** in the Twilio Console to detect anomalies

## 📱 Push Notifications Setup (Optional)

For production use with real push notifications:

### Android (Firebase Cloud Messaging)

1. Create a Firebase project
2. Download `google-services.json`
3. Add FCM push credentials to Twilio Console
4. Install Firebase libraries: `npm install @react-native-firebase/app @react-native-firebase/messaging`
5. Get FCM token and pass it as `pushToken`

### iOS (Apple Push Notification Service)

1. Configure APNS certificates in Apple Developer Portal
2. Add push credentials to Twilio Console
3. Configure Xcode project for push notifications
4. Get APNS token and pass it as `pushToken`

## 🤝 Contributing

This is an example application. Feel free to use it as a starting point for your own Twilio Verify implementation.

## 📄 License

This example app is provided as-is for educational purposes.

## 🆘 Support

For Twilio Verify SDK issues:

- GitHub: [twilio/twilio-verify-for-react-native](https://github.com/twilio/twilio-verify-for-react-native)
- Twilio Support: [support.twilio.com](https://support.twilio.com)

For general Twilio questions:

- Twilio Docs: [twilio.com/docs](https://www.twilio.com/docs)
- Twilio Community: [twilio.com/community](https://www.twilio.com/community)

---

**Built with ❤️ using Twilio Verify and React Native**
