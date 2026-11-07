/*
 * Garment segmentation in its own process.
 *
 * @imgly/background-removal-node ships its own sharp (libvips); loading it in
 * the API process next to the app's sharp makes the two libvips copies clash.
 * So this runs separately: photo in (file path), PNG with the product cut out
 * (alpha = garment mask) written to the output path.
 *
 *   node workers/segment.cjs <input-image> <output-png>
 */
const fs = require('fs');
const {removeBackground} = require('@imgly/background-removal-node');

(async () => {
    const [input, output] = process.argv.slice(2);
    const data = fs.readFileSync(input);
    // The model reads the format from the type: PNG/WEBP by their signature, JPEG otherwise
    const type =
        data[0] === 0x89 && data[1] === 0x50 ? 'image/png' : data.subarray(8, 12).toString() === 'WEBP' ? 'image/webp' : 'image/jpeg';
    const blob = await removeBackground(new Blob([data], {type}), {
        model: 'medium',
        output: {format: 'image/png', quality: 1},
    });
    fs.writeFileSync(output, Buffer.from(await blob.arrayBuffer()));
})().catch((error) => {
    process.stderr.write(String(error?.message ?? error));
    process.exit(1);
});
