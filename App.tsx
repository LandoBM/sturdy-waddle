import { SafeAreaProvider } from 'react-native-safe-area-context'
import { GestureHandlerRootView } from 'react-native-gesture-handler'
import { AppBottomSheetProvider } from './native/BottomSheet'
import './global.css'
import './native/activity'
import NativeApp from './native/App'

export default function App() {
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <AppBottomSheetProvider>
          <NativeApp />
        </AppBottomSheetProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  )
}
