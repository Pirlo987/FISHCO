import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '@/constants/communityPalette';
import { displayName, formatTimeAgo } from '@/lib/communityHelpers';
import { UserAvatar } from './UserAvatar';
import type { CommentRow } from './types';
import { useLanguage } from '@/providers/LanguageProvider';

type Props = {
  isOpen: boolean;
  comments: CommentRow[];
  draft: string;
  onDraftChange: (text: string) => void;
  onSubmit: () => void;
};

export const CommentSection = React.memo(function CommentSection({
  isOpen,
  comments,
  draft,
  onDraftChange,
  onSubmit,
}: Props) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  return (
    <View style={styles.box}>
      {comments.length > 0 && (
        <View style={styles.list}>
          {comments.map((c) => {
            const cName = displayName(c.profiles);
            const timeAgo = formatTimeAgo(c.created_at);
            return (
              <View key={c.id} style={styles.row}>
                <UserAvatar profile={c.profiles} name={cName} size={28} />
                <View style={styles.content}>
                  <Text style={styles.line}>
                    <Text style={styles.author}>{cName} </Text>
                    {c.content}
                  </Text>
                  <Text style={styles.time}>{timeAgo}</Text>
                </View>
              </View>
            );
          })}
        </View>
      )}
      <View style={styles.inputWrap}>
        <TextInput
          placeholder={t('community_add_comment')}
          placeholderTextColor={C.muted}
          value={draft}
          onChangeText={onDraftChange}
          style={styles.input}
          multiline
        />
        <Pressable
          style={[styles.send, draft.trim() && styles.sendActive]}
          hitSlop={8}
          onPress={onSubmit}
          disabled={!draft.trim()}
        >
          <Ionicons name="arrow-up" size={16} color={draft.trim() ? '#FFFFFF' : C.muted} />
        </Pressable>
      </View>
    </View>
  );
});

const styles = StyleSheet.create({
  box: { marginTop: 10, gap: 10 },
  list: { gap: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
  content: { flex: 1, gap: 2 },
  line: { fontSize: 13, color: C.text, lineHeight: 18 },
  author: { fontWeight: '700' },
  time: { fontSize: 11, color: C.muted },
  inputWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.inputBg,
    borderRadius: 24,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  input: { flex: 1, minHeight: 36, maxHeight: 80, fontSize: 14, color: C.text, paddingRight: 8 },
  send: {
    width: 30,
    height: 30,
    borderRadius: 15,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: C.border,
  },
  sendActive: { backgroundColor: C.accent },
});
