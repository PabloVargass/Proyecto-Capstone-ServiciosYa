import { StyleSheet, Switch, Text, View } from 'react-native';
import { useAppPreferences, useThemedStyles } from '@/context/app-preferences';
import type { AppColors } from '@/constants/app-theme';
import { chileRegions, type PublicationFilters } from '@/services/publication-search';
import { SearchFilterSelect } from './search-filter-select';
import { serviceCategoryOptions } from '@/constants/service-categories';

export function PublicationSearchFilters({ value, onChange, categories }: { value: PublicationFilters; onChange: (value: PublicationFilters) => void; categories: string[] }) {
  const { t, colors } = useAppPreferences(); const styles = useThemedStyles(createStyles);
  const region = chileRegions.find(item => item.id === value.regionId);
  return <View>
    <SearchFilterSelect label="Tipo de servicio" value={value.type} emptyLabel="Todos los servicios" emptyValue="ALL" options={[{ value: 'SERVICIO', label: t('Ofrece servicio') }, { value: 'OPORTUNIDAD', label: t('Solicita servicio') }]} onChange={type => onChange({ ...value, type: type as PublicationFilters['type'] })} />
    <View style={styles.row}><View style={{ flex: 1 }}><Text style={styles.label}>{t('Servicios destacados')}</Text><Text style={styles.help}>{t('Mostrar recomendaciones por afinidad.')}</Text></View><Switch accessibilityLabel={t('Servicios destacados')} value={value.featured} onValueChange={featured => onChange({ ...value, featured })} trackColor={{ false: colors.border, true: colors.accent }} thumbColor={colors.text} /></View>
    <SearchFilterSelect label="Categoría" value={value.category} emptyLabel="Todas las categorías" options={serviceCategoryOptions(categories)} allowCustom onChange={category => onChange({ ...value, category })} />
    <SearchFilterSelect label="Región" value={value.regionId} emptyLabel="Todas las regiones" options={chileRegions.map(item => ({ value: item.id, label: item.name }))} onChange={regionId => onChange({ ...value, regionId, commune: '' })} />
    <SearchFilterSelect key={value.regionId} label="Comuna" value={value.commune} emptyLabel={region ? 'Todas las comunas' : 'Selecciona una región primero'} disabled={!region} options={(region?.communes ?? []).map(item => ({ value: item.name, label: item.name }))} onChange={commune => onChange({ ...value, commune })} />
  </View>;
}
const createStyles = (colors: AppColors) => StyleSheet.create({ row: { flexDirection: 'row', alignItems: 'center', gap: 16, marginBottom: 20 }, label: { color: colors.text, fontWeight: '700', fontSize: 14 }, help: { color: colors.muted, fontSize: 12, marginTop: 5, lineHeight: 17 } });
