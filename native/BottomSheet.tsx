import { BottomSheetBackdrop, BottomSheetModal, BottomSheetModalProvider, BottomSheetScrollView, BottomSheetView } from '@gorhom/bottom-sheet'
import { useCallback, useEffect, useRef, type ReactNode } from 'react'
import { Pressable, StyleSheet, Text, View } from 'react-native'
import { useSafeAreaInsets } from 'react-native-safe-area-context'

export { BottomSheetModalProvider, BottomSheetScrollView }

type BottomSheetProps = {
  visible: boolean
  onClose: () => void
  children: ReactNode
  backgroundColor: string
  borderColor: string
  maxHeight?: `${number}%` | number
  accessibilityLabel?: string
}

export type AppBottomSheetProps = BottomSheetProps

export type SheetAction = {
  id: string
  label: string
  destructive?: boolean
  disabled?: boolean
  onPress: () => void
}

export function BottomSheet({ visible, onClose, children, backgroundColor, borderColor, maxHeight = '88%', accessibilityLabel = 'Bottom sheet' }: BottomSheetProps) {
  const ref = useRef<BottomSheetModal>(null)
  const insets = useSafeAreaInsets()

  useEffect(() => {
    if (visible) ref.current?.present()
    else ref.current?.dismiss()
  }, [visible])

  const renderBackdrop = useCallback((props: any) => (
    <BottomSheetBackdrop {...props} appearsOnIndex={0} disappearsOnIndex={-1} pressBehavior="close" opacity={0.52} />
  ), [])

  return (
    <BottomSheetModal
      ref={ref}
      snapPoints={['25%', '90%']}
      enableDynamicSizing
      enablePanDownToClose
      onDismiss={onClose}
      backdropComponent={renderBackdrop}
      backgroundStyle={{ backgroundColor, borderColor, borderWidth: 1 }}
      handleIndicatorStyle={{ backgroundColor: borderColor, width: 42, height: 4 }}
      keyboardBehavior="interactive"
      keyboardBlurBehavior="restore"
      android_keyboardInputMode="adjustResize"
      accessible
      accessibilityViewIsModal
      accessibilityLabel={accessibilityLabel}
    >
      <BottomSheetView style={[styles.content, { paddingBottom: Math.max(insets.bottom, 12), maxHeight }]}>
        {children}
      </BottomSheetView>
    </BottomSheetModal>
  )
}

export function AppBottomSheet(props: AppBottomSheetProps) {
  return <BottomSheet {...props} />
}

export function ActionBottomSheet({ actions, title, ...props }: AppBottomSheetProps & { title?: string; actions: SheetAction[] }) {
  return (
    <BottomSheet {...props}>
      {!!title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.actionList}>
        {actions.map((action) => (
          <Pressable key={action.id} onPress={action.onPress} disabled={action.disabled} style={[styles.action, action.destructive && styles.destructiveAction, action.disabled && styles.disabledAction]} accessibilityRole="button">
            <Text style={[styles.actionText, action.destructive && styles.destructiveText]}>{action.label}</Text>
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  )
}

export function SelectionBottomSheet<T extends string>({ options, selected, onSelect, title, ...props }: AppBottomSheetProps & { title?: string; options: readonly { value: T; label: string; description?: string }[]; selected: T; onSelect: (value: T) => void }) {
  return (
    <BottomSheet {...props}>
      {!!title && <Text style={styles.title}>{title}</Text>}
      <View style={styles.actionList}>
        {options.map((option) => (
          <Pressable key={option.value} onPress={() => onSelect(option.value)} style={styles.selection} accessibilityRole="radio" accessibilityState={{ selected: selected === option.value }}>
            <View style={{ flex: 1 }}><Text style={styles.actionText}>{option.label}</Text>{!!option.description && <Text style={styles.description}>{option.description}</Text>}</View>
            {selected === option.value && <Text style={styles.checkmark}>✓</Text>}
          </Pressable>
        ))}
      </View>
    </BottomSheet>
  )
}

export function ConfirmationBottomSheet({ title, message, confirmLabel = 'Confirm', destructive = false, loading = false, onConfirm, ...props }: AppBottomSheetProps & { title: string; message?: string; confirmLabel?: string; destructive?: boolean; loading?: boolean; onConfirm: () => void }) {
  return (
    <BottomSheet {...props}>
      <Text style={styles.title}>{title}</Text>
      {!!message && <Text style={styles.description}>{message}</Text>}
      <Pressable onPress={onConfirm} disabled={loading} style={[styles.action, destructive && styles.destructiveAction, loading && styles.disabledAction]}><Text style={[styles.actionText, destructive && styles.destructiveText]}>{loading ? 'Working…' : confirmLabel}</Text></Pressable>
      <Pressable onPress={props.onClose} disabled={loading} style={styles.cancel}><Text style={styles.description}>Cancel</Text></Pressable>
    </BottomSheet>
  )
}

export function FilterBottomSheet({ title = 'Filters', children, onApply, onReset, onCancel, ...props }: AppBottomSheetProps & { title?: string; onApply: () => void; onReset?: () => void; onCancel?: () => void }) {
  return (
    <BottomSheet {...props}>
      <Text style={styles.title}>{title}</Text>
      {children}
      <View style={styles.footer}><Pressable onPress={onReset} disabled={!onReset} style={styles.footerButton}><Text style={styles.description}>Reset</Text></Pressable><Pressable onPress={onCancel ?? props.onClose} style={styles.footerButton}><Text style={styles.description}>Cancel</Text></Pressable><Pressable onPress={onApply} style={[styles.footerButton, styles.applyButton]}><Text style={styles.applyText}>Apply</Text></Pressable></View>
    </BottomSheet>
  )
}

export function AppBottomSheetProvider({ children }: { children: ReactNode }) {
  return <BottomSheetModalProvider>{children}</BottomSheetModalProvider>
}

const styles = StyleSheet.create({
  content: { width: '100%', paddingHorizontal: 18, paddingTop: 8 },
  title: { color: '#171C19', fontSize: 20, fontWeight: '900', marginBottom: 12 },
  actionList: { gap: 8 },
  action: { minHeight: 48, justifyContent: 'center', paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#F5F6F2' },
  selection: { minHeight: 56, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, borderRadius: 16, backgroundColor: '#F5F6F2' },
  actionText: { color: '#171C19', fontSize: 14, fontWeight: '800' },
  description: { color: '#68736B', fontSize: 12, lineHeight: 18 },
  checkmark: { color: '#FF7900', fontSize: 20, fontWeight: '900' },
  destructiveAction: { backgroundColor: '#FCE9E7' },
  destructiveText: { color: '#B42318' },
  disabledAction: { opacity: 0.55 },
  cancel: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  footer: { flexDirection: 'row', gap: 8, marginTop: 16 },
  footerButton: { minHeight: 46, flex: 1, alignItems: 'center', justifyContent: 'center', borderRadius: 16, backgroundColor: '#F5F6F2' },
  applyButton: { backgroundColor: '#FF7900' },
  applyText: { color: '#FFFFFF', fontWeight: '900' },
})
