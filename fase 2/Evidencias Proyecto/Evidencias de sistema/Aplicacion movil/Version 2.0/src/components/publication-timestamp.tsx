import { Text, View, type StyleProp, type TextStyle } from 'react-native';
import { useAppPreferences } from '@/context/app-preferences';

export function PublicationTimestamp({ createdAt, expiresAt, expired, style }: {
  createdAt?: string;
  expiresAt?: string;
  expired?: boolean;
  style?: StyleProp<TextStyle>;
}) {
  const { locale, t } = useAppPreferences();
  if (!createdAt) return null;
  const date = new Date(createdAt);
  if (Number.isNaN(date.getTime())) return null;
  const formatted = date.toLocaleString(locale, {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
  });
  return <View>
    <Text style={style}>{t('Publicado')}: {formatted}</Text>
    {expiresAt && <Text style={style}>{t(expired ? 'Venció' : 'Vence')}: {new Date(expiresAt).toLocaleString(locale, {
      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit', timeZoneName: 'short',
    })}</Text>}
  </View>;
}
