import { SafeAreaProvider } from 'react-native-safe-area-context'
import NativeApp from './native/App'

export default function App() {
  return (
    <SafeAreaProvider>
      <NativeApp />
    </SafeAreaProvider>
  )
}
