export interface WatermarkOptions {
	jobCode: string;
	latitude?: number;
	longitude?: number;
}

export interface WatermarkResult {
	dataUrl: string;
	sha256: string;
}

export async function watermarkAndHashImage(
	file: File,
	options: WatermarkOptions,
): Promise<WatermarkResult> {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const reader = new FileReader();

		reader.onload = () => {
			img.onload = async () => {
				try {
					const canvas = document.createElement("canvas");
					const maxDim = 1200;
					let width = img.width;
					let height = img.height;

					if (width > maxDim || height > maxDim) {
						if (width > height) {
							height = Math.round((height * maxDim) / width);
							width = maxDim;
						} else {
							width = Math.round((width * maxDim) / height);
							height = maxDim;
						}
					}

					canvas.width = width;
					canvas.height = height;
					const ctx = canvas.getContext("2d");
					if (!ctx) {
						reject(new Error("Canvas context unavailable"));
						return;
					}

					ctx.drawImage(img, 0, 0, width, height);

					const bannerHeight = Math.max(38, Math.round(height * 0.065));
					ctx.fillStyle = "rgba(11, 61, 71, 0.90)";
					ctx.fillRect(0, height - bannerHeight, width, bannerHeight);

					ctx.fillStyle = "#FFFFFF";
					ctx.font = `bold ${Math.round(bannerHeight * 0.4)}px monospace, sans-serif`;
					const timestamp = new Date()
						.toISOString()
						.replace("T", " ")
						.slice(0, 19);
					const geoText =
						options.latitude && options.longitude
							? ` • GPS: ${options.latitude.toFixed(4)}°, ${options.longitude.toFixed(4)}°`
							: " • CDMX";
					const text = `YESSYFY QA • ${options.jobCode} • ${timestamp}${geoText}`;
					ctx.fillText(text, 16, height - Math.round(bannerHeight * 0.35));

					const dataUrl = canvas.toDataURL("image/jpeg", 0.85);

					const rawBuffer = new TextEncoder().encode(dataUrl);
					const digest = await crypto.subtle.digest("SHA-256", rawBuffer);
					const hashArray = Array.from(new Uint8Array(digest));
					const sha256 = hashArray
						.map((b) => b.toString(16).padStart(2, "0"))
						.join("");

					resolve({ dataUrl, sha256 });
				} catch (err) {
					reject(err);
				}
			};
			img.onerror = reject;
			img.src = reader.result as string;
		};
		reader.onerror = reject;
		reader.readAsDataURL(file);
	});
}
