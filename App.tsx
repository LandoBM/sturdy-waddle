import { SafeAreaProvider } from 'react-native-safe-area-context'
import './global.css'
import './native/activity'
import NativeApp from './native/App'

export default function App() {
  return (
    <SafeAreaProvider>
      <NativeApp />
    </SafeAreaProvider>
  )
}
