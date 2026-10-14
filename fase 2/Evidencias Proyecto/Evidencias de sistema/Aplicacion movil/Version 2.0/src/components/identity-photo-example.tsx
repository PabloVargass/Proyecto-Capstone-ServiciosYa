import { StyleSheet, Text, View } from 'react-native';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
export function IdentityPhotoExample() {
  const { t } = useAppPreferences(); const styles = useThemedStyles(createStyles);
  return <View style={styles.frame} accessibilityLabel={t('Ejemplo: rostro descubierto y cédula legible junto al rostro')}>
    <View style={styles.scene}><View style={styles.person}><View style={styles.face}><Text style={styles.faceText}>•  •</Text><Text style={styles.faceText}>⌣</Text></View><View style={styles.body} /></View>
      <View style={styles.document}><Text style={styles.label}>{t('Cédula')}</Text><View style={styles.row}><View style={styles.portrait} /><View style={styles.lines}><View style={styles.line} /><View style={styles.line} /><View style={styles.line} /></View></View></View>
    </View><Text style={styles.caption}>{t('Ejemplo ilustrado')}</Text><Text style={styles.caption}>{t('Muestra tu rostro completo y sostén tu cédula al lado, con sus datos legibles y sin reflejos.')}</Text>
  </View>;
}
const createStyles = (colors: AppColors) => StyleSheet.create({
  frame: { padding: 18, backgroundColor: colors.surface, borderRadius: 18, borderWidth: 1, borderStyle: 'dashed', borderColor: colors.accent, gap: 12 },
  scene: { height: 160, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 12 }, person: { alignItems: 'center' },
  face: { height: 84, width: 68, borderRadius: 34, borderWidth: 2, borderColor: colors.accent, alignItems: 'center', justifyContent: 'center' }, faceText: { color: colors.text, fontSize: 19 },
  body: { height: 52, width: 95, borderTopLeftRadius: 40, borderTopRightRadius: 40, backgroundColor: colors.primary, marginTop: 8 },
  document: { width: 115, height: 80, padding: 10, borderRadius: 8, borderWidth: 2, borderColor: colors.accent }, label: { color: colors.text, fontSize: 11, fontWeight: '700' },
  row: { flexDirection: 'row', gap: 8, marginTop: 8 }, portrait: { width: 24, height: 28, borderRadius: 4, backgroundColor: colors.primary }, lines: { flex: 1, gap: 6, paddingTop: 3 }, line: { height: 3, backgroundColor: colors.muted },
  caption: { color: colors.muted, fontSize: 13, lineHeight: 19, textAlign: 'center' },
});
