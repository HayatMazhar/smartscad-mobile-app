import { createListenerMiddleware, createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { HeroBannerSize, HomeSectionConfig, HomeSectionId, HomeSectionVariant } from './homeLayoutTypes';
import { HOME_SECTION_IDS } from './homeLayoutTypes';
import { loadUiPreferencesJson, saveUiPreferencesJson } from '../storage/uiPreferencesStorage';
import type { ColorPaletteId, FontFamilyId, FontSizeStep } from './themePreferencesTypes';
function defaultHomeSections(): Record<HomeSectionId, HomeSectionConfig> {
  const o = {} as Record<HomeSectionId, HomeSectionConfig>;
  for (const id of HOME_SECTION_IDS) {
    o[id] = { visible: true, variant: 'default' };
  }
  return o;
}

function mergeSaved(
  saved: Partial<{
    homeHeroSize: HeroBannerSize;
    homeSections: Partial<Record<HomeSectionId, HomeSectionConfig>>;
    colorPaletteId: ColorPaletteId;
    fontSizeStep: FontSizeStep;
    fontFamilyId: FontFamilyId;
  }> | null,
) {
  const homeSections = defaultHomeSections();
  if (saved?.homeSections) {
    for (const id of HOME_SECTION_IDS) {
      const row = saved.homeSections[id];
      if (row) {
        homeSections[id] = {
          visible: row.visible !== false,
          variant: row.variant === 'compact' ? 'compact' : 'default',
        };
      }
    }
  }
  const homeHeroSize: HeroBannerSize =
    saved?.homeHeroSize === 'large' || saved?.homeHeroSize === 'medium' || saved?.homeHeroSize === 'compact'
      ? saved.homeHeroSize
      : 'medium';
  const pid = saved?.colorPaletteId;
  const colorPaletteId: ColorPaletteId =
    pid === 'govSoft' || pid === 'govAbuDhabi' || pid === 'scadVibrant'
      ? pid
      : 'scadVibrant';
  const fs = saved?.fontSizeStep;
  const fontSizeStep: FontSizeStep =
    fs === 'smaller' || fs === 'larger' || fs === 'largest' || fs === 'default' ? fs : 'default';
  const ff = saved?.fontFamilyId;
  const fontFamilyId: FontFamilyId = ff === 'sans' || ff === 'serif' || ff === 'system' ? ff : 'system';
  return { homeHeroSize, homeSections, colorPaletteId, fontSizeStep, fontFamilyId };
}

const initialFromDisk = mergeSaved(loadUiPreferencesJson());

export interface UiPreferencesState {
  homeHeroSize: HeroBannerSize;
  homeSections: Record<HomeSectionId, HomeSectionConfig>;
  colorPaletteId: ColorPaletteId;
  fontSizeStep: FontSizeStep;
  fontFamilyId: FontFamilyId;
}

const initialState: UiPreferencesState = {
  homeHeroSize: initialFromDisk.homeHeroSize,
  homeSections: initialFromDisk.homeSections,
  colorPaletteId: initialFromDisk.colorPaletteId,
  fontSizeStep: initialFromDisk.fontSizeStep,
  fontFamilyId: initialFromDisk.fontFamilyId,
};

const uiPreferencesSlice = createSlice({
  name: 'uiPreferences',
  initialState,
  reducers: {
    setHomeHeroSize: (state, action: PayloadAction<HeroBannerSize>) => {
      state.homeHeroSize = action.payload;
    },
    setHomeSectionVisible: (state, action: PayloadAction<{ id: HomeSectionId; visible: boolean }>) => {
      const { id, visible } = action.payload;
      state.homeSections[id].visible = visible;
    },
    setHomeSectionVariant: (state, action: PayloadAction<{ id: HomeSectionId; variant: HomeSectionVariant }>) => {
      const { id, variant } = action.payload;
      state.homeSections[id].variant = variant;
    },
    resetHomeLayout: (state) => {
      state.homeHeroSize = 'medium';
      state.homeSections = defaultHomeSections();
    },
    setColorPaletteId: (state, action: PayloadAction<ColorPaletteId>) => {
      state.colorPaletteId = action.payload;
    },
    setFontSizeStep: (state, action: PayloadAction<FontSizeStep>) => {
      state.fontSizeStep = action.payload;
    },
    setFontFamilyId: (state, action: PayloadAction<FontFamilyId>) => {
      state.fontFamilyId = action.payload;
    },
  },
});

export const {
  setHomeHeroSize,
  setHomeSectionVisible,
  setHomeSectionVariant,
  resetHomeLayout,
  setColorPaletteId,
  setFontSizeStep,
  setFontFamilyId,
} = uiPreferencesSlice.actions;
export default uiPreferencesSlice.reducer;

export const uiPreferencesListener = createListenerMiddleware();
uiPreferencesListener.startListening({
  predicate: (action) => String(action.type).startsWith('uiPreferences/'),
  effect: (_action, api) => {
    const s = api.getState() as { uiPreferences: UiPreferencesState };
    saveUiPreferencesJson({
      homeHeroSize: s.uiPreferences.homeHeroSize,
      homeSections: s.uiPreferences.homeSections,
      colorPaletteId: s.uiPreferences.colorPaletteId,
      fontSizeStep: s.uiPreferences.fontSizeStep,
      fontFamilyId: s.uiPreferences.fontFamilyId,
    });
  },
});
