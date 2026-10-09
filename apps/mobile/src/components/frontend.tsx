import { createContext, useContext, useState, forwardRef, type ComponentProps, type ReactNode } from 'react';
import { StyleSheet, Text, TextInput as NativeTextInput, View } from 'react-native';
import { ActivityIndicator, TouchableRipple, MD3DarkTheme, PaperProvider, TextInput } from 'react-native-paper';
import { MaterialDesignIcons } from '@react-native-vector-icons/material-design-icons';
import { useFonts } from 'expo-font';

export const colors = { canvas: '#111111', panel: '#222222', ink: '#F5F2E9', secondary: '#C3C0B8', gold: '#F2B84B', shadow: '#050505', saved: '#8CD8AA', error: '#FFADB5' };
export const theme = { ...MD3DarkTheme, roundness: 1, animation: { scale: 0 }, colors: { ...MD3DarkTheme.colors, primary: colors.gold, onPrimary: colors.canvas, background: colors.canvas, surface: colors.panel, onSurface: colors.ink, onSurfaceVariant: colors.secondary, outline: colors.secondary, error: colors.error, surfaceDisabled: colors.panel, onSurfaceDisabled: colors.secondary } };
const FontReady = createContext({ heading: false, body: false });
export function BodyText(props: ComponentProps<typeof Text>) {
  const { body } = useContext(FontReady);
  return <Text {...props} style={[props.style, body && { fontFamily: 'VT323', fontWeight: 'normal' }]} />;
}
export function FrontendProvider({ children }: { children: ReactNode }) {
  const [headingLoaded] = useFonts({ PixelifySemiBold: require('../../assets/fonts/PixelifySans-SemiBold.ttf') });
  const [bodyLoaded] = useFonts({ VT323: require('../../assets/fonts/VT323-Regular.ttf') });
  const paperTheme = { ...theme, fonts: Object.fromEntries(Object.entries(theme.fonts).map(([key, value]) => [key, { ...value, ...(bodyLoaded ? { fontFamily: 'VT323', fontWeight: 'normal' } : {}) }])) as typeof theme.fonts };
  return <FontReady.Provider value={{ heading: headingLoaded, body: bodyLoaded }}><PaperProvider theme={paperTheme} settings={{ icon: (props) => <MaterialDesignIcons {...props} name={props.name as React.ComponentProps<typeof MaterialDesignIcons>['name']} /> }}>{children}</PaperProvider></FontReady.Provider>;
}
export function PageHeading({ children }: { children: string }) {
  const { heading: loaded } = useContext(FontReady);
  return <Text accessibilityRole="header" style={[ui.heading, loaded && { fontFamily: 'PixelifySemiBold', fontWeight: 'normal' }]}>{children}</Text>;
}
export function Action({ title, text = title, onPress, disabled = false, busy = false, primary = false, danger = false }: {
  title: string; text?: string; onPress: () => void; disabled?: boolean; busy?: boolean; primary?: boolean; danger?: boolean;
}) {
  const [pressed, setPressed] = useState(false);
  const [focused, setFocused] = useState(false);
  return <View style={primary ? ui.actionShadow : undefined}><TouchableRipple theme={theme}
    accessibilityRole="button" accessibilityLabel={title} accessibilityState={{ disabled, busy }} aria-disabled={disabled} aria-busy={busy} disabled={disabled} onPress={onPress}
    onPressIn={() => setPressed(true)} onPressOut={() => setPressed(false)} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)}
    rippleColor="transparent"
    style={[ui.action, ui.actionContent, { backgroundColor: primary && !disabled ? colors.gold : colors.panel, borderColor: focused ? colors.ink : danger ? colors.error : colors.secondary }, primary && !focused && { borderColor: colors.gold }, disabled && { borderStyle: 'dashed' }, pressed && { transform: [{ translateX: 2 }, { translateY: 2 }], borderColor: colors.ink }, focused && { borderWidth: 3 }]}>
    <BodyText style={[ui.actionLabel, { color: disabled ? colors.secondary : primary ? colors.canvas : danger ? colors.error : colors.ink }]}>{text}</BodyText>
  </TouchableRipple></View>;
}
export const Field = forwardRef<NativeTextInput, ComponentProps<typeof TextInput>>(function Field(props, ref) {
  const { body } = useContext(FontReady);
  return <TextInput {...props} ref={ref} theme={{ ...theme, fonts: Object.fromEntries(Object.entries(theme.fonts).map(([key, value]) => [key, { ...value, ...(body ? { fontFamily: 'VT323', fontWeight: 'normal' } : {}) }])) as typeof theme.fonts }}
    style={[props.style, { fontSize: 22, lineHeight: 28 }, body && { fontFamily: 'VT323', fontWeight: 'normal' }]} contentStyle={[props.contentStyle, body && { fontFamily: 'VT323', fontWeight: 'normal' }]} />;
});
export const fieldProps: Partial<ComponentProps<typeof TextInput>> = {
  theme, mode: 'outlined', outlineColor: colors.secondary, activeOutlineColor: colors.gold, textColor: colors.ink,
  placeholderTextColor: colors.secondary, style: { backgroundColor: colors.panel, fontSize: 22, lineHeight: 28 },
  outlineStyle: { borderRadius: 4, borderWidth: 2 }, contentStyle: { minHeight: 56, paddingHorizontal: 12 },
};
export function Loading({ text }: { text: string }) {
  return <View accessibilityLiveRegion="polite" style={ui.loading}><ActivityIndicator theme={theme} color={colors.gold} size="small" /><BodyText style={ui.copy}>{text}</BodyText></View>;
}
export const ui = StyleSheet.create({
  page: { flex: 1, backgroundColor: colors.canvas },
  container: { flexGrow: 1, paddingHorizontal: 20, paddingVertical: 32 },
  panel: { width: '100%', maxWidth: 640, alignSelf: 'center', gap: 16 },
  heading: { color: colors.ink, fontSize: 30, lineHeight: 36, fontWeight: '600', flexShrink: 1 },
  section: { color: colors.ink, fontSize: 26, lineHeight: 32, fontWeight: '600' },
  copy: { fontSize: 21, lineHeight: 26, color: colors.secondary, flexShrink: 1 },
  error: { fontSize: 21, lineHeight: 26, color: colors.error },
  label: { color: colors.ink, fontSize: 22, lineHeight: 28, fontWeight: '600' },
  frame: { backgroundColor: colors.panel, borderWidth: 2, borderColor: colors.secondary, borderRadius: 8, padding: 20, gap: 16 },
  header: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 16 },
  action: { borderWidth: 2, borderRadius: 4, minWidth: 48 },
  actionShadow: { backgroundColor: colors.shadow, borderRadius: 4, paddingRight: 3, paddingBottom: 3 },
  actionContent: { minHeight: 48, paddingVertical: 12, justifyContent: 'center', alignItems: 'center' },
  actionLabel: { fontSize: 22, lineHeight: 28, fontWeight: '600', marginHorizontal: 12, flexShrink: 1, flexWrap: 'wrap' },
  loading: { flexDirection: 'row', alignItems: 'center', gap: 12 },
});
