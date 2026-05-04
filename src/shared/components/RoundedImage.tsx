import React from 'react';
import { Image, ImageStyle, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';

interface RoundedImageProps {
  source: { uri?: string } | number;
  width: number;
  height: number;
  borderRadius: number;
  style?: StyleProp<ViewStyle>;
  imageStyle?: StyleProp<ImageStyle>;
  resizeMode?: 'cover' | 'contain' | 'stretch' | 'center';
}

/**
 * Cross-platform image with clipped rounded corners.
 *
 * On Android, `overflow: 'hidden'` does not clip child Image components in all
 * RN versions. The fix is to apply `borderRadius` on BOTH the wrapper View and
 * the Image itself — this is what makes rounding work reliably on both platforms.
 */
const RoundedImage: React.FC<RoundedImageProps> = ({
  source,
  width,
  height,
  borderRadius,
  style,
  imageStyle,
  resizeMode = 'cover',
}) => {
  return (
    <View
      style={[
        styles.wrapper,
        { width, height, borderRadius },
        style,
      ]}
    >
      <Image
        source={source}
        style={[
          { width, height, borderRadius },
          imageStyle,
        ]}
        resizeMode={resizeMode}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    overflow: 'hidden',
  },
});

export default RoundedImage;
