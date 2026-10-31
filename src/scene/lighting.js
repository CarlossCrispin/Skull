import { AmbientLight, DirectionalLight, Group } from 'three';

const RAW_DIRECTION = [-1, 0.55, 0.45];
const RAW_LENGTH = Math.hypot(...RAW_DIRECTION);

/** Unit vector from the model toward the key light (screen-left, above, in front). */
export const LIGHT_DIRECTION = [
  RAW_DIRECTION[0] / RAW_LENGTH,
  RAW_DIRECTION[1] / RAW_LENGTH,
  RAW_DIRECTION[2] / RAW_LENGTH,
];

/** DEFAULT intensities; tuned at the visual checkpoint. Shared with the poster rasterizer. */
export const DIRECTIONAL_INTENSITY = 2.6;
export const AMBIENT_INTENSITY = 0.9;

const LIGHT_DISTANCE = 100;
const LIGHT_COLOR = 0xffffff;

/** One lateral DirectionalLight plus one low AmbientLight; no shadows. */
export function createLightRig() {
  const rig = new Group();
  const key = new DirectionalLight(LIGHT_COLOR, DIRECTIONAL_INTENSITY);
  key.position.set(
    LIGHT_DIRECTION[0] * LIGHT_DISTANCE,
    LIGHT_DIRECTION[1] * LIGHT_DISTANCE,
    LIGHT_DIRECTION[2] * LIGHT_DISTANCE,
  );
  key.castShadow = false;
  const fill = new AmbientLight(LIGHT_COLOR, AMBIENT_INTENSITY);
  rig.add(key, fill);
  return rig;
}
