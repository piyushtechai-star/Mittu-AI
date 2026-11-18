// Implicit Terms & Conditions (meeting brief 2026-11-17): no checkbox or pop-up; this line sits under the main action
// button, and going ahead counts as agreeing. The links open the published policy pages.
import { Linking, Text } from 'react-native';

import { fonts, scene } from '@/theme';

const LEGAL = 'https://houseoftech-legal.web.app/mittu-ai';

export function ConsentLine({ align = 'center' }: { align?: 'center' | 'left' }) {
  const link = (path: string, label: string) => (
    <Text accessibilityRole="link" onPress={() => Linking.openURL(`${LEGAL}/${path}`)}
      style={{ color: scene.goldSoft, textDecorationLine: 'underline' }}>{label}</Text>
  );
  return (
    <Text style={{ fontFamily: fonts.ui, fontSize: 11.5, lineHeight: 17, color: 'rgba(246,238,219,0.62)', textAlign: align, marginTop: 10 }}>
      Aage badhne par aap hamari {link('terms', 'Terms & Conditions')} aur {link('privacy', 'Privacy Policy')} se sahmat hain.
    </Text>
  );
}
