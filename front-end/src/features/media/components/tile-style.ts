/** The wall's and the picker's grid gaps; the padding leaves room for the corner mark, which sits on the tile's edge. */
export const TILE_GAPS = 'gap-x-2 gap-y-3 p-1'

/**
 * The app's chosen border (gift options C03, as in the story editor's pickers): 2 px red when chosen, transparent
 * otherwise, so a tile never changes size. Set on the rounded photo wrapper.
 */
export const chosenBorder = (chosen: boolean) => `border-2 ${chosen ? 'border-accent' : 'border-transparent'}`
