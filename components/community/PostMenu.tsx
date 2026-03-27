import React from 'react';
import {
  Modal,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '@/constants/communityPalette';

const REASONS = [
  { key: 'inappropriate', label: 'Contenu inapproprie' },
  { key: 'spam', label: 'Spam ou publicite' },
  { key: 'impersonation', label: 'Usurpation d\'identite' },
  { key: 'harassment', label: 'Harcelement' },
  { key: 'other', label: 'Autre' },
];

type Props = {
  visible: boolean;
  reported: boolean;
  onHide: () => void;
  onReport: (reason: string) => void;
  onBlockUser: () => void;
  onClose: () => void;
};

export const PostMenu = React.memo(function PostMenu({
  visible,
  reported,
  onHide,
  onReport,
  onBlockUser,
  onClose,
}: Props) {
  const [step, setStep] = React.useState<'main' | 'reasons' | 'done'>('main');

  React.useEffect(() => {
    if (visible) setStep(reported ? 'done' : 'main');
  }, [visible, reported]);

  const handleReport = (reason: string) => {
    onReport(reason);
    setStep('done');
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      statusBarTranslucent
      onRequestClose={handleClose}
    >
      <Pressable style={styles.backdrop} onPress={handleClose}>
        <Pressable style={styles.sheet} onPress={() => {}}>
          {step === 'main' && (
            <>
              <View style={styles.handle} />
              <MenuItem
                icon="flag-outline"
                label="Signaler cette publication"
                color={C.like}
                onPress={() => setStep('reasons')}
              />
              <Separator />
              <MenuItem
                icon="eye-off-outline"
                label="Masquer cette publication"
                color={C.sub}
                onPress={() => { onHide(); handleClose(); }}
              />
              <Separator />
              <MenuItem
                icon="person-remove-outline"
                label="Bloquer cet utilisateur"
                color={C.like}
                onPress={() => { onBlockUser(); handleClose(); }}
              />
              <Separator />
              <MenuItem
                icon="close-outline"
                label="Annuler"
                color={C.muted}
                onPress={handleClose}
              />
            </>
          )}

          {step === 'reasons' && (
            <>
              <View style={styles.handle} />
              <Text style={styles.reasonTitle}>Pourquoi signaler ?</Text>
              {REASONS.map((r, i) => (
                <React.Fragment key={r.key}>
                  {i > 0 && <Separator />}
                  <MenuItem
                    icon="chevron-forward-outline"
                    label={r.label}
                    color={C.text}
                    onPress={() => handleReport(r.key)}
                  />
                </React.Fragment>
              ))}
              <Separator />
              <MenuItem
                icon="arrow-back-outline"
                label="Retour"
                color={C.muted}
                onPress={() => setStep('main')}
              />
            </>
          )}

          {step === 'done' && (
            <>
              <View style={styles.handle} />
              <View style={styles.doneBox}>
                <View style={styles.doneIcon}>
                  <Ionicons name="checkmark-circle" size={40} color={C.accent} />
                </View>
                <Text style={styles.doneTitle}>Signalement envoye</Text>
                <Text style={styles.doneSub}>
                  Merci. Notre equipe va examiner ce contenu.
                </Text>
              </View>
              <Separator />
              <MenuItem
                icon="close-outline"
                label="Fermer"
                color={C.muted}
                onPress={handleClose}
              />
            </>
          )}
        </Pressable>
      </Pressable>
    </Modal>
  );
});

function MenuItem({
  icon,
  label,
  color,
  onPress,
}: {
  icon: string;
  label: string;
  color: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      style={({ pressed }) => [styles.menuItem, pressed && styles.menuItemPressed]}
      onPress={onPress}
    >
      <Ionicons name={icon as any} size={20} color={color} />
      <Text style={[styles.menuLabel, { color }]}>{label}</Text>
    </Pressable>
  );
}

function Separator() {
  return <View style={styles.sep} />;
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.45)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: C.surface,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 32,
    paddingTop: 8,
  },
  handle: {
    width: 36,
    height: 4,
    borderRadius: 2,
    backgroundColor: C.border,
    alignSelf: 'center',
    marginBottom: 16,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  menuItemPressed: { backgroundColor: C.inputBg },
  menuLabel: { fontSize: 16, fontWeight: '500' },
  sep: {
    height: StyleSheet.hairlineWidth,
    backgroundColor: C.border,
    marginHorizontal: 24,
  },
  reasonTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: C.muted,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    paddingHorizontal: 24,
    paddingBottom: 8,
  },
  doneBox: {
    alignItems: 'center',
    paddingVertical: 24,
    paddingHorizontal: 24,
    gap: 8,
  },
  doneIcon: {
    width: 72,
    height: 72,
    borderRadius: 36,
    backgroundColor: C.accentSoft,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 4,
  },
  doneTitle: { fontSize: 17, fontWeight: '700', color: C.text },
  doneSub: { fontSize: 14, color: C.sub, textAlign: 'center', lineHeight: 20 },
});
