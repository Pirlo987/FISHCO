import React from 'react';
import { Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import Ionicons from '@expo/vector-icons/Ionicons';
import { C } from '@/constants/communityPalette';
import { displayName, formatTimeAgo } from '@/lib/communityHelpers';
import { UserAvatar } from './UserAvatar';
import type { CommentRow } from './types';
import { useLanguage } from '@/providers/LanguageProvider';
import { MAX_COMMENT_LENGTH } from '@/hooks/useCommunityFeed';

const URL_REGEX = /https?:\/\/|www\./i;

type Props = {
  isOpen: boolean;
  comments: CommentRow[];
  draft: string;
  reportedCommentIds: Set<string>;
  onDraftChange: (text: string) => void;
  onSubmit: () => void;
  onReportComment: (commentId: string) => void;
};

export const CommentSection = React.memo(function CommentSection({
  isOpen,
  comments,
  draft,
  reportedCommentIds,
  onDraftChange,
  onSubmit,
  onReportComment,
}: Props) {
  const { t } = useLanguage();
  if (!isOpen) return null;

  const hasUrl = URL_REGEX.test(draft);
  const overLimit = draft.length > MAX_COMMENT_LENGTH;
  const canSubmit = draft.trim().length > 0 && !hasUrl && !overLimit;
  const showCounter = draft.length > MAX_COMMENT_LENGTH - 100;

  return (
    <View style={styles.box}>
      {comments.length > 0 && (
        <View style={styles.list}>
          {comments.map((c) => {
            const cName = displayName(c.profiles);
            const timeAgo = formatTimeAgo(c.created_at);
            const alreadyReported = reportedCommentIds.has(c.id);
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
                <Pressable
                  hitSlop={10}
                  onPress={() => !alreadyReported && onReportComment(c.id)}
                  style={styles.flagBtn}
                >
                  <Ionicons
                    name={alreadyReported ? 'flag' : 'flag-outline'}
                    size={13}
                    color={alreadyReported ? C.like : C.muted}
                  />
                </Pressable>
              </View>
            );
          })}
        </View>
      )}
      {(hasUrl || overLimit) && (
        <Text style={styles.inputError}>
          {hasUrl ? 'Les liens ne sont pas autorises' : `Maximum ${MAX_COMMENT_LENGTH} caracteres`}
        </Text>
      )}
      <View style={[styles.inputWrap, (hasUrl || overLimit) && styles.inputWrapError]}>
        <TextInput
          placeholder={t('community_add_comment')}
          placeholderTextColor={C.muted}
          value={draft}
          onChangeText={onDraftChange}
          style={styles.input}
          multiline
          maxLength={MAX_COMMENT_LENGTH + 10}
        />
        {showCounter && (
          <Text style={[styles.counter, overLimit && styles.counterOver]}>
            {MAX_COMMENT_LENGTH - draft.length}
          </Text>
        )}
        <Pressable
          style={[styles.send, canSubmit && styles.sendActive]}
          hitSlop={8}
          onPress={onSubmit}
          disabled={!canSubmit}
        >
          <Ionicons name="arrow-up" size={16} color={canSubmit ? '#FFFFFF' : C.muted} />
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
  flagBtn: { paddingLeft: 6, paddingTop: 2 },
  inputError: { fontSize: 12, color: C.like, marginBottom: 4 },
  inputWrapError: { borderWidth: 1, borderColor: C.like },
  counter: { fontSize: 12, color: C.sub, marginRight: 6 },
  counterOver: { color: C.like, fontWeight: '700' },
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
