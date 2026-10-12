export { default as AccessSecurityPass } from "./components/AccessSecurityPass.svelte";
export { default as AuthOtpModal } from "./components/AuthOtpModal.svelte";
export { default as BeforeAfterSlider } from "./components/BeforeAfterSlider.svelte";
export { default as BottomSheet } from "./components/BottomSheet.svelte";
export { default as ClientReviewAndRatingSheet } from "./components/ClientReviewAndRatingSheet.svelte";
export { default as CotizadorWidget } from "./components/CotizadorWidget.svelte";
export { default as DetailSheet } from "./components/DetailSheet.svelte";
export { default as EscrowStatusCard } from "./components/EscrowStatusCard.svelte";
export { default as FiscalInvoiceDrawer } from "./components/FiscalInvoiceDrawer.svelte";
export { default as Logo } from "./components/Logo.svelte";
export { default as SatInvoicePdfModal } from "./components/fiscal/SatInvoicePdfModal.svelte";
export { default as WarrantyCertificatePdfModal } from "./components/fiscal/WarrantyCertificatePdfModal.svelte";
export { default as SatPacStampingPreview } from "./components/fiscal/SatPacStampingPreview.svelte";
export { default as InvoiceDownloadActions } from "./components/fiscal/InvoiceDownloadActions.svelte";
export {
	buildSatVerificationUrl,
	downloadFile,
	downloadPdfViaPrint,
	generateCfdi40Xml,
	printElement,
	type PrintOptions,
	renderQrCodeSvg,
} from "./components/fiscal/pdfExport.ts";
export { default as InAppChatDrawer } from "./components/InAppChatDrawer.svelte";
export { default as PhotoUploader } from "./components/PhotoUploader.svelte";
export { default as CameraViewfinderModal } from "./components/photo/CameraViewfinderModal.svelte";
export { default as PhotoPreviewCard } from "./components/photo/PhotoPreviewCard.svelte";
export {
	calculateSha256,
	calculateTargetDimensions,
	formatNom151Timestamp,
	getPhaseLabel,
	watermarkAndHashImage,
	watermarkCanvas,
	type WatermarkOptions,
	type WatermarkResult,
} from "./components/photo/CanvasWatermarker.ts";
export { default as PriceBreakdown } from "./components/PriceBreakdown.svelte";
export { default as StatusBadge } from "./components/StatusBadge.svelte";
export { default as SupplementalApprovalModal } from "./components/SupplementalApprovalModal.svelte";
export { default as SvgGpsTracker } from "./components/SvgGpsTracker.svelte";
export { default as TechProfileCard } from "./components/TechProfileCard.svelte";
export { default as TrustBadge } from "./components/TrustBadge.svelte";
export { default as VehiclePlateCard } from "./components/VehiclePlateCard.svelte";
export { default as WarrantyCard } from "./components/WarrantyCard.svelte";
export { default as LeafletInteractiveMap } from "./components/LeafletInteractiveMap.svelte";
export { default as RouteSimulatorHud } from "./components/RouteSimulatorHud.svelte";
export type {
	ClientDestination,
	TechnicianPin,
} from "./components/map/mapTypes.ts";

export { default as SdkBadge } from "./sdk-badge.svelte";
export { default as Showcase } from "./showcase.svelte";

export { default as ToastContainer } from "./components/toast/ToastContainer.svelte";
export { default as ToastItem } from "./components/toast/ToastItem.svelte";
export { SoundEngine, soundEngine } from "./audio/soundEngine.ts";
export type { ToastPosition } from "./components/toast/ToastContainer.svelte";

export * from "./types.ts";
