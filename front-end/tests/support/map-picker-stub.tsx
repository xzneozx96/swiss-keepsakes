import { RecenterIcon, TrashIcon } from '@/components/icons'
import { MapControlButton } from '@/components/map/map-controls'

/**
 * MapLibre needs a canvas, which jsdom has not: the place picker is replaced by a button that places a pin, next to the
 * kit's own round control buttons (Recenter, and Remove the position once there is a position).
 */
export const mapPickerStub = {
  MapPicker: ({ lat, onPlace, onRemove }: { lat: number | null, onPlace: (position: { lat: number, lng: number }) => void, onRemove?: () => void }) => (
    <div>
      <button type="button" onClick={() => onPlace({ lat: 47.05, lng: 8.3 })}>Place pin</button>
      <MapControlButton icon={RecenterIcon} label="Recenter on the pin" onPress={() => undefined} />
      {lat !== null && onRemove && <MapControlButton icon={TrashIcon} label="Remove the position" tone="danger" onPress={onRemove} />}
    </div>
  ),
}
