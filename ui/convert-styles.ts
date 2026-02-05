#!/usr/bin/env bun

import { join } from 'node:path';
import { converter } from 'culori';

// Create converter from OKLCH to HSL
const oklchToHsl = converter('hsl');

/**
 * Parse oklch() strings and convert to HSL
 */
function convertOklchToHsl(cssContent: string): string {
	// Match oklch() with optional alpha
	const oklchRegex = /oklch\(([^)]+)\)/g;

	return cssContent.replace(oklchRegex, (match, values) => {
		// Parse the values (can be space or comma separated)
		const parts = values
			.split(/[\s,/]+/)
			.map((v: string) => v.trim())
			.filter((v: string) => v.length > 0);

		if (parts.length < 3) {
			console.warn(`Invalid OKLCH value: ${match}`);
			return match;
		}

		const l = parseFloat(parts[0]);
		const c = parseFloat(parts[1]);
		const h = parseFloat(parts[2]) || 0; // Hue defaults to 0 if not specified

		// Handle alpha - could be percentage or decimal
		let alpha: number | undefined;
		if (parts[3]) {
			const alphaStr = parts[3];
			if (alphaStr.includes('%')) {
				alpha = parseFloat(alphaStr) / 100;
			} else {
				alpha = parseFloat(alphaStr);
			}
		}

		if (Number.isNaN(l) || Number.isNaN(c)) {
			console.warn(`Invalid OKLCH numbers: ${match}`);
			return match;
		}

		// Convert using culori
		const hsl = oklchToHsl({ mode: 'oklch', l, c, h, alpha });

		if (!hsl) {
			console.warn(`Failed to convert: ${match}`);
			return match;
		}

		// Format as "h, s%, l%"
		const hue = Math.round(hsl.h ?? 0);
		const sat = Math.round((hsl.s ?? 0) * 100);
		const light = Math.round((hsl.l ?? 0) * 100);

		/* if (hsl.alpha) {
			return `${hue}, ${sat}%, ${light}%, ${hsl.alpha}`;
		} */

		return `${hue}, ${sat}%, ${light}%`;
	});
}

async function main() {
	const srcPath = join(import.meta.dir, 'src', 'styles.css');
	const outPath = join(import.meta.dir, 'src', 'styles.chrome86.css');

	console.log(`Reading ${srcPath}...`);
	const srcFile = Bun.file(srcPath);
	const content = await srcFile.text();

	console.log('Converting OKLCH colors to HSL...');
	const converted = convertOklchToHsl(content);

	console.log(`Writing to ${outPath}...`);
	await Bun.write(outPath, converted);

	console.log('✓ Conversion complete!');
}

main().catch((error) => {
	console.error('Error:', error);
	process.exit(1);
});
