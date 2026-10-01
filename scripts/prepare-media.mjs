import { readdir, readFile, mkdir, copyFile, writeFile } from 'node:fs/promises';
import path from 'node:path';
import sharp from 'sharp';

const root = process.cwd();
const captures = path.join(root, 'captures');
const output = path.join(root, 'public/media');
await mkdir(output, { recursive: true });
await mkdir(path.join(root, 'src'), { recursive: true });
const names = { ballista: 'Ballista', barbershopchair01: 'Barbershop chair', bauble: 'Bauble', bomb: 'Bomb', cardbox: 'Cardboard box', chessset: 'Chess set', firehydrant: 'Fire hydrant', glove: 'Glove', numerickeypad: 'Numeric keypad', spam: 'Spam' };
const methods = ['bc1', 'neural', 'neural_mse', 'uncompressed'];
const datasets = new Map();
for (const folder of (await readdir(captures, { withFileTypes: true })).filter(entry => entry.isDirectory()).sort((a,b) => a.name.localeCompare(b.name))) {
  const dir = path.join(captures, folder.name);
  const manifest = JSON.parse((await readFile(path.join(dir, 'manifest.json'), 'utf8')).replace(/^\uFEFF/, ''));
  const { dataset: id, rendering_config: method } = manifest;
  if (!methods.includes(method)) throw new Error(`Unknown method: ${method}`);
  const videos = (await readdir(dir)).filter(file => file.endsWith('.mp4'));
  if (videos.length !== 1) throw new Error(`Expected one MP4 in ${dir}`);
  const filename = `${id}-${method}.mp4`;
  await copyFile(path.join(dir, videos[0]), path.join(output, filename));
  if (!datasets.has(id)) datasets.set(id, { id, name: names[id] || id, width: manifest.width, height: manifest.height, fps: manifest.fps, duration: manifest.duration_seconds, videos: {}, poster: `media/${id}.webp` });
  const entry = datasets.get(id);
  if (entry.videos[method]) throw new Error(`Duplicate capture: ${id}/${method}`);
  if (entry.width !== manifest.width || entry.height !== manifest.height || entry.fps !== manifest.fps || entry.duration !== manifest.duration_seconds) throw new Error(`Mismatched captures: ${id}`);
  entry.videos[method] = `media/${filename}`;
  if (method === 'uncompressed') await sharp(path.join(dir, 'frames/frame_0000.png')).webp({ quality: 85 }).toFile(path.join(output, `${id}.webp`));
}
for (const entry of datasets.values()) for (const method of methods) if (!entry.videos[method]) throw new Error(`Missing ${method} for ${entry.id}`);
await writeFile(path.join(root, 'src/datasets.json'), JSON.stringify([...datasets.values()], null, 2) + '\n');
console.log(`Prepared ${datasets.size} datasets, ${datasets.size * methods.length} videos and ${datasets.size} thumbnails.`);
