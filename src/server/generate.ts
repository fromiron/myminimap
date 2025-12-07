import { GoogleGenAI } from "@google/genai";
import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";

export type GenerateInput = {
	lat: number;
	lng: number;
	heading: number;
	pitch: number;
	fov: number;
};

export type GenerationResult = {
	locationName: string;
	prompt: string;
	staticUrl: string;
	imageBase64: string;
	mode: "gemini" | "passthrough";
	error?: string;
};

const MAPS_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
const GEOCODE_KEY = process.env.VITE_GOOGLE_MAPS_API_KEY;
const GEMINI_API_KEY = process.env.VITE_GEMINI_API_KEY;
const USE_GEMINI = process.env.VITE_USE_GEMINI !== "false";

const inputSchema = z.object({
	lat: z.number(),
	lng: z.number(),
	heading: z.number(),
	pitch: z.number(),
	fov: z.number(),
});

export const generateMiniature = createServerFn({ method: "POST" })
	.inputValidator((data: GenerateInput) => inputSchema.parse(data))
	.handler(async ({ data }) => {
		const { lat, lng, heading, pitch, fov } = data;

		if (!MAPS_KEY) {
			throw new Error("Missing GOOGLE_MAPS_API_KEY");
		}

		// Street View 이미지 가져오기
		const staticUrl = new URL(
			"https://maps.googleapis.com/maps/api/streetview",
		);
		staticUrl.search = new URLSearchParams({
			size: "1024x1024",
			location: `${lat},${lng}`,
			heading: heading.toString(),
			pitch: pitch.toString(),
			fov: fov.toString(),
			key: MAPS_KEY,
		}).toString();

		const imgRes = await fetch(staticUrl.toString());
		if (!imgRes.ok) {
			throw new Error(`Street View fetch failed: ${imgRes.status}`);
		}
		const imageBuffer = await imgRes.arrayBuffer();
		const imageBase64 = Buffer.from(imageBuffer).toString("base64");

		// 역지오코딩으로 위치명 가져오기
		let locationName = "this location";
		if (GEOCODE_KEY) {
			try {
				const geoUrl = new URL(
					"https://maps.googleapis.com/maps/api/geocode/json",
				);
				geoUrl.search = new URLSearchParams({
					latlng: `${lat},${lng}`,
					key: GEOCODE_KEY,
				}).toString();

				const geoRes = await fetch(geoUrl.toString());
				if (geoRes.ok) {
					const geoJson: {
						results?: Array<{
							formatted_address?: string;
							address_components?: Array<{ long_name?: string }>;
						}>;
					} = await geoRes.json();
					const firstResult = geoJson.results?.[0];
					locationName =
						firstResult?.formatted_address ??
						firstResult?.address_components?.[1]?.long_name ??
						locationName;
				}
			} catch (error) {
				console.warn("Reverse geocoding failed", error);
			}
		}

		const prompt = `Transform this street view photo into a 3D isometric cartoon miniature diorama.
Preserve the exact buildings, road layout, vehicles, signs, and architectural details from the original photo.
Style it with:
- Toy-like miniature scale
- Clean lines and bright, cheerful colors
- Soft shadows and gentle lighting
- 45-degree isometric perspective
Keep the same composition and recognizable elements from the source image.
Generate the transformed image.`;

		let response: GenerationResult = {
			locationName,
			prompt,
			staticUrl: staticUrl.toString(),
			imageBase64,
			mode: "passthrough",
		};

		if (GEMINI_API_KEY && USE_GEMINI) {
			try {
				// v1alpha API 버전 사용 (이미지 생성에 필요)
				const ai = new GoogleGenAI({
					apiKey: GEMINI_API_KEY,
					apiVersion: "v1alpha",
				});

				// Gemini 3 Pro Image로 이미지 + 텍스트 입력하여 이미지 생성
				console.log("[Gemini] Sending request with image...");
				const geminiResponse = await ai.models.generateContent({
					model: "gemini-3-pro-image-preview",
					contents: [
						{
							parts: [
								{ text: prompt },
								{
									inlineData: {
										mimeType: "image/png",
										data: imageBase64,
									},
								},
							],
						},
					],
					config: {
						responseModalities: ["image", "text"],
						imageConfig: {
							aspectRatio: "1:1",
							imageSize: "1K",
						},
					},
				});

				// 디버깅: 전체 응답 구조 출력
				console.log(
					"[Gemini] Response:",
					JSON.stringify(geminiResponse, null, 2),
				);

				// 응답에서 이미지 추출
				const candidate = geminiResponse.candidates?.[0];
				console.log("[Gemini] Candidate:", JSON.stringify(candidate, null, 2));

				if (candidate?.content?.parts) {
					console.log("[Gemini] Parts count:", candidate.content.parts.length);
					for (const part of candidate.content.parts) {
						console.log("[Gemini] Part keys:", Object.keys(part));
						if (part.text) {
							console.log(
								"[Gemini] Text response:",
								part.text.substring(0, 200),
							);
						}
						if (part.inlineData?.data) {
							console.log(
								"[Gemini] Found image data, length:",
								part.inlineData.data.length,
							);
							response = {
								locationName,
								prompt,
								staticUrl: staticUrl.toString(),
								imageBase64: part.inlineData.data,
								mode: "gemini",
							};
							break;
						}
					}
				} else {
					console.log("[Gemini] No parts found in candidate");
				}

				if (response.mode === "passthrough") {
					response.error = "Gemini response missing image data";
				}
			} catch (error) {
				response.error = `Gemini generation failed: ${String(error)}`;
			}
		}

		return response;
	});
