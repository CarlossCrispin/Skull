// Horizontal gutters shared by every section: 20 px, 32 px from sm, 48 px from md.
export const GUTTER_CLASSES = 'px-5 sm:px-8 md:px-12';

// The poem card (design Decision 45): centered, at most 720 px wide (max-w-180 = 180 x 4 px), padded
// 24 / 40 px horizontally and 4 svh vertically so it fits one screen. The gutters above are its outer margin.
export const CARD_MAX_WIDTH_PX = 720;
export const CARD_CLASSES = 'mx-auto w-full max-w-180 px-6 py-[4svh] sm:px-10';

// Gutter of the HUD frames (the motionsite reference): 20 px below md, 35 px from md. The padding form is for
// rows that flow; the left / right forms position absolute pieces on the same edge.
export const HUD_GUTTER_CLASSES = 'px-5 md:px-[35px]';
export const HUD_GUTTER_LEFT_CLASSES = 'left-5 md:left-[35px]';
export const HUD_GUTTER_RIGHT_CLASSES = 'right-5 md:right-[35px]';
