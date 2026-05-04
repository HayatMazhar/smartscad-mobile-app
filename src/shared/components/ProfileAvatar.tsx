import React, { useState } from 'react';
import { View, Text, Image, StyleSheet } from 'react-native';
import { useTheme } from '../../app/theme/ThemeContext';
import { profileImageUrl } from '../utils/profileImage';

interface Props {
  userId?: string;
  name?: string;
  size?: number;
  borderRadius?: number;
  backgroundColor?: string;
  fontSize?: number;
}

function getInitials(name?: string): string {
  if (!name) return '?';
  const p = name.trim().split(/\s+/);
  return p.length === 1
    ? p[0].charAt(0).toUpperCase()
    : (p[0].charAt(0) + p[p.length - 1].charAt(0)).toUpperCase();
}

const ProfileAvatar: React.FC<Props> = ({
  userId,
  name,
  size = 48,
  borderRadius = 14,
  backgroundColor: bgProp,
  fontSize,
}) => {
  const { colors } = useTheme();
  const backgroundColor = bgProp ?? colors.primary;
  const [imgFailed, setImgFailed] = useState(false);
  const imgUrl = profileImageUrl(userId);
  const showImage = !!imgUrl && !imgFailed;
  const fs = fontSize ?? Math.round(size * 0.38);

  return (
    <View style={[styles.wrap, { width: size, height: size, borderRadius, backgroundColor }]}>
      {showImage ? (
        <Image
          source={{ uri: imgUrl }}
          style={[styles.img, { width: size, height: size, borderRadius }]}
          onError={() => setImgFailed(true)}
        />
      ) : (
        <Text style={[styles.initials, { fontSize: fs }]}>{getInitials(name)}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrap: { justifyContent: 'center', alignItems: 'center', overflow: 'hidden' },
  img: { position: 'absolute' },
  initials: { color: '#fff', fontWeight: '800' },
});

export default ProfileAvatar;
