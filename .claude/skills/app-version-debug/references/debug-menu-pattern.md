# Debug Menu Pattern

Hidden debug menu triggered by tapping the app version info 3 times within 500ms.

## Required Components

### 1. UPDATE_VERSION constant (top of settings file)

```tsx
const UPDATE_VERSION = 1
```

### 2. Version display

```tsx
const appVersion = (Constants.expoConfig?.version || '1.0.0') + '-' + UPDATE_VERSION;
```

Display format: `1.0.7-5` (semver from app.json + OTA update counter).

### 3. Triple-tap handler

```tsx
const tapCountRef = useRef(0);
const tapTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

useEffect(() => {
  return () => {
    if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
  };
}, []);

const handleAppDetailsPress = useCallback(() => {
  tapCountRef.current += 1;
  if (tapTimeoutRef.current) clearTimeout(tapTimeoutRef.current);
  if (tapCountRef.current >= 3) {
    tapCountRef.current = 0;
    showDebugOptions();
    return;
  }
  tapTimeoutRef.current = setTimeout(() => {
    tapCountRef.current = 0;
  }, 500);
}, [showDebugOptions]);
```

### 4. Debug menu alert

```tsx
const showDebugOptions = useCallback(() => {
  Alert.alert(
    'Debug Options',  // Localize as needed
    'Choose an action',
    [
      {
        text: 'Reset Onboarding',
        onPress: async () => { /* reset onboarding state */ },
      },
      {
        text: 'Notification Lab',
        onPress: () => { router.push('/notification-test'); },
      },
      { text: 'Cancel', style: 'cancel' },
    ],
    { cancelable: true }
  );
}, []);
```

### 5. Touchable version row

```tsx
<TouchableOpacity onPress={handleAppDetailsPress} activeOpacity={0.8}>
  <Text>App Details</Text>
  <Text>Version {appVersion}</Text>
</TouchableOpacity>
```

## Dependencies

- `expo-constants` for `Constants.expoConfig.version`
- `react-native` Alert for debug menu
- `expo-router` for navigation to debug screens

## npm scripts pattern

```json
{
  "update": "node scripts/increment-update-version.js && npx eas update",
  "build:production:ios": "node scripts/bump-app-version.js && npx eas build --platform ios --profile production",
  "build:production:android": "node scripts/bump-app-version.js && npx eas build --platform android --profile production"
}
```
