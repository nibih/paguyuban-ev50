import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';

/**
 * Photo capture for the MVP.
 *
 * The paguyuban's Firebase project does not have Cloud Storage enabled, so
 * photos are downscaled here and stored as base64 on the Firestore document
 * itself. Firestore caps a document at 1 MiB, so every helper below is
 * budgeted to stay far under that ceiling with room to spare.
 */

// Target width for a thumbnail. A 400px JPEG at the quality below lands around
// 25–60 KB once base64-encoded, which leaves ~950 KB of headroom in the doc.
export const THUMB_WIDTH = 400;
export const THUMB_QUALITY = 0.6;

// Per-image ceiling once base64-encoded. Well under Firestore's 1 MiB doc cap,
// leaving room for the rest of the record plus sibling photos.
export const MAX_BASE64_BYTES = 200 * 1024;

// How many photos a single record may carry.
export const MAX_PHOTOS = 3;

const B64_OVERHEAD = 1.34; // base64 expands raw bytes by ~4/3

/**
 * Pick an image from camera or library and return it downscaled to a
 * thumbnail, or null if the user backed out or a permission was denied.
 *
 * @param {'camera'|'library'} source
 * @param {{ quality?: number, maxDimension?: number }} [opts]
 * @returns {Promise<{ uri: string, base64: string, bytes: number }|null>}
 */
export async function captureThumbnail(source, opts = {}) {
  const permission = source === 'camera'
    ? await ImagePicker.requestCameraPermissionsAsync()
    : await ImagePicker.requestMediaLibraryPermissionsAsync();

  if (!permission.granted) {
    const label = source === 'camera' ? 'Kamera' : 'Galeri';
    throw new Error(
      `Izin ${label} ditolak. Aktifkan lewat Pengaturan HP agar foto bisa diambil.`
    );
  }

  const pickerOptions = {
    mediaTypes: ['images'],
    quality: 1, // we compress ourselves after downscaling
    base64: false,
    allowsEditing: false
  };

  const result = source === 'camera'
    ? await ImagePicker.launchCameraAsync(pickerOptions)
    : await ImagePicker.launchImageLibraryAsync(pickerOptions);

  if (result.canceled || !result.assets?.length) return null;

  return compressToThumbnail(result.assets[0].uri, opts);
}

/**
 * Downscale an existing local image to thumbnail dimensions and encode it.
 *
 * @param {string} uri - local file URI
 * @param {{ maxDimension?: number, quality?: number }} [opts]
 * @returns {Promise<{ uri: string, base64: string, bytes: number }>}
 */
export async function compressToThumbnail(uri, opts = {}) {
  const maxDimension = opts.maxDimension ?? THUMB_WIDTH;
  const quality = opts.quality ?? THUMB_QUALITY;

  const manipulated = await manipulateAsync(
    uri,
    [{ resize: { width: maxDimension } }],
    { compress: quality, format: SaveFormat.JPEG, base64: true }
  );

  const base64 = manipulated.base64;
  if (!base64) throw new Error('Gagal mengompres foto. Coba ambil ulang.');

  // Approximate, not exact: we only need a cheap guard against blowing the
  // document cap, not a byte-accurate size.
  const bytes = Math.round(base64.length * (3 / 4));

  if (bytes > MAX_BASE64_BYTES) {
    // Retry harder rather than failing outright — a busy depot photo on a
    // high-end phone can exceed the first-pass budget.
    const tighter = await manipulateAsync(
      uri,
      [{ resize: { width: Math.round(maxDimension * 0.6) } }],
      { compress: Math.max(0.3, quality * 0.7), format: SaveFormat.JPEG, base64: true }
    );
    const retryBytes = Math.round((tighter.base64?.length ?? 0) * (3 / 4));
    if (tighter.base64 && retryBytes <= MAX_BASE64_BYTES) {
      return { uri: tighter.uri, base64: tighter.base64, bytes: retryBytes };
    }
    throw new Error('Foto terlalu besar meski sudah dikompres. Coba foto dengan resolusi lebih kecil.');
  }

  return { uri: manipulated.uri, base64, bytes };
}

/**
 * Rough payload size of a set of thumbnails plus the record's own fields,
 * used to refuse a save that would exceed the Firestore document cap.
 *
 * @param {Array<{ base64?: string }>} photos
 * @returns {number} approximate bytes
 */
export function photosPayloadBytes(photos = []) {
  return photos.reduce((sum, p) => sum + (p?.base64 ? p.base64.length / B64_OVERHEAD : 0), 0);
}
