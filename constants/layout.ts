import { Dimensions, PixelRatio } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Guideline sizes are based on standard ~5" screen mobile device
const guidelineBaseWidth = 375;
const guidelineBaseHeight = 812;

export const scale = (size: number) => Math.round((SCREEN_WIDTH / guidelineBaseWidth) * size);
export const vScale = (size: number) => Math.round((SCREEN_HEIGHT / guidelineBaseHeight) * size);
export const moderateScale = (size: number, factor = 0.5) => Math.round(size + (scale(size) - size) * factor);

export const LAYOUT = {
    window: {
        width: SCREEN_WIDTH,
        height: SCREEN_HEIGHT,
    },
    isSmallDevice: SCREEN_WIDTH < 375,
};

export default LAYOUT;
