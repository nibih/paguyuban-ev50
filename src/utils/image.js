// Browser-side photo downscaling.
//
// Photos ride on the Firestore document as base64 because this project has no
// Cloud Storage bucket, and a document is capped at 1 MiB. The mobile app
// already budgets every capture to a 400px JPEG at quality 0.6 (see
// mobile/src/utils/thumbnails.js); this mirrors that budget so a photo taken
// at the depot desk and one taken on a phone cost the same.
//
// The output is the bare base64 payload without the `data:` prefix, exactly
// what the mobile app stores, so both clients can read each other's photos.

const MAX_BASE64_CHARS = 200 * 1024;
const DATA_PREFIX = 'data:image/jpeg;base64,';

const encode = (file, maxDimension, quality) => new Promise((resolve, reject) => {
  const url = URL.createObjectURL(file);
  const img = new Image();

  img.onload = () => {
    URL.revokeObjectURL(url);
    const scale = Math.min(1, maxDimension / Math.max(img.width, img.height));
    const width = Math.max(1, Math.round(img.width * scale));
    const height = Math.max(1, Math.round(img.height * scale));

    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    const ctx = canvas.getContext('2d');
    // White matte: a transparent PNG re-encoded as JPEG would otherwise turn
    // its transparent areas black.
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, width, height);
    ctx.drawImage(img, 0, 0, width, height);

    const dataUrl = canvas.toDataURL('image/jpeg', quality);
    resolve(dataUrl.startsWith(DATA_PREFIX) ? dataUrl.slice(DATA_PREFIX.length) : dataUrl);
  };

  img.onerror = () => {
    URL.revokeObjectURL(url);
    reject(new Error('File ini tidak bisa dibaca sebagai gambar.'));
  };

  img.src = url;
});

/**
 * Downscale an image File to bare base64 JPEG, or throw with a message that
 * can be shown to the cashier.
 *
 * @param {File} file
 * @param {{ maxDimension?: number, quality?: number }} [opts]
 * @returns {Promise<string>}
 */
export const fileToBase64 = async (file, opts = {}) => {
  if (!file) throw new Error('Pilih file terlebih dahulu.');
  if (!/^image\//.test(file.type)) throw new Error('File harus berupa gambar (JPG/PNG).');

  const maxDimension = opts.maxDimension || 700;
  const quality = opts.quality || 0.55;

  let base64 = await encode(file, maxDimension, quality);

  // A phone photo of a dense form can still overshoot at the first setting.
  // Tighten once rather than reject a picture the cashier already took.
  if (base64.length > MAX_BASE64_CHARS) {
    base64 = await encode(file, Math.round(maxDimension * 0.7), Math.max(0.3, quality * 0.7));
  }
  if (base64.length > MAX_BASE64_CHARS) {
    throw new Error('Foto terlalu besar. Ambil dari jarak lebih dekat atau perkecil gambarnya.');
  }

  return base64;
};

export const base64Src = (base64) => (base64 ? `${DATA_PREFIX}${base64}` : null);
