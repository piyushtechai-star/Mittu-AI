import { router } from 'expo-router';
import { Text, View } from 'react-native';

import { Mittu } from '@/components/Mittu';
import { Button, Screen } from '@/components/ui';
import { colors, space, type } from '@/theme';

export default function Welcome() {
  return (
    <Screen scroll={false} footer={<Button title="Shuru karein" onPress={() => router.push('/auth/phone')} />}>
      <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center', gap: space.lg }}>
        <View style={{ width: 180, height: 180, borderRadius: 90, backgroundColor: colors.accentSoft, alignItems: 'center', justifyContent: 'center' }}>
          <Mittu size={150} />
        </View>
        <Text style={[type.largeTitle, { textAlign: 'center' }]}>Mittu AI</Text>
        <Text style={[type.callout, { textAlign: 'center', color: colors.textSecondary, maxWidth: 300 }]}>
          Apna sawaal poochiye. Mittu tarot card nikaal kar aapka bhavishya sunayega.
        </Text>
      </View>
      <Text style={[type.footnote, { textAlign: 'center', marginBottom: space.sm }]}>Sirf manoranjan ke liye</Text>
    </Screen>
  );
}
