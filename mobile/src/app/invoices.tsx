import Ionicons from '@expo/vector-icons/Ionicons';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { useState } from 'react';
import { ActivityIndicator, Platform, Text } from 'react-native';

import { getInvoiceHtml, getInvoices, type Invoice } from '@/api/mittu';
import { ErrorView, Group, Header, Loading, Row, Screen } from '@/components/ui';
import { prettyDate, rupees } from '@/lib/format';
import { useLoad } from '@/lib/useLoad';
import { colors, space, type } from '@/theme';

// GST invoices are rendered by the backend (shared HouseofTech template); the phone turns them into a PDF.
export default function Invoices() {
  const { data: items, error, reload: load } = useLoad(getInvoices, []);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  async function download(inv: Invoice) {
    setBusyId(inv.id);
    setNote(null);
    try {
      const html = await getInvoiceHtml(inv.id);
      if (Platform.OS === 'web') {
        window.open(URL.createObjectURL(new Blob([html], { type: 'text/html' })), '_blank');
      } else {
        const { uri } = await Print.printToFileAsync({ html });
        await Sharing.shareAsync(uri, { mimeType: 'application/pdf', UTI: 'com.adobe.pdf', dialogTitle: inv.number });
      }
    } catch (e) {
      setNote((e as Error).message);
    } finally {
      setBusyId(null);
    }
  }

  return (
    <Screen>
      <Header title="Invoices" />
      {error ? <ErrorView onRetry={load} /> : !items ? <Loading /> : items.length === 0 ? (
        <Text style={type.subhead}>Abhi koi invoice nahi.</Text>
      ) : (
        <Group>
          {items.map((i) => (
            <Row key={i.id} icon="receipt-outline" title={i.number} subtitle={`${prettyDate(i.paidAt * 1000)} · ${rupees(i.amountPaise)} · ${i.description}`}
              onPress={() => download(i)}
              right={busyId === i.id ? <ActivityIndicator color={colors.accent} /> : <Ionicons name="download-outline" size={20} color={colors.accent} />} />
          ))}
        </Group>
      )}
      {note ? <Text style={[type.subhead, { color: colors.danger, marginTop: space.md }]}>{note}</Text> : null}
    </Screen>
  );
}
