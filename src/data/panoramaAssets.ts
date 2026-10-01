export type PanoramaAssetKind = "property" | "development-demo" | "flat-preview";

export type PanoramaAsset = {
  id: string;
  label: string;
  src: string;
  width: number;
  height: number;
  aspectRatio: number;
  kind: PanoramaAssetKind;
  immersiveEligible: boolean;
  propertyMedia: boolean;
  note: string;
};

/**
 * Stage 12.5 asset audit.
 *
 * The two 2048×1024 files are exact 2:1 images and are technically suitable
 * for exercising Marzipano as development/demo sources. They are NOT Tejjora
 * property photography and must never be presented as such.
 *
 * The 905×360 wide image is not 2:1 and is therefore flat-preview-only.
 */
export const panoramaAssets = {
  demoLiving: {
    id: "demo-living",
    label: "Interior living-room 360 demo",
    src: "/panoramas/demo/interior-living-360.jpg",
    width: 2048,
    height: 1024,
    aspectRatio: 2,
    kind: "development-demo",
    immersiveEligible: true,
    propertyMedia: false,
    note: "Development panorama only — not Tejjora Lake View property media.",
  },
  demoKitchen: {
    id: "demo-kitchen",
    label: "Interior kitchen 360 demo",
    src: "/panoramas/demo/interior-kitchen-360.jpg",
    width: 2048,
    height: 1024,
    aspectRatio: 2,
    kind: "development-demo",
    immersiveEligible: true,
    propertyMedia: false,
    note: "Development panorama only — not Tejjora Lake View property media.",
  },
  widePreview: {
    id: "wide-preview",
    label: "Wide panoramic preview",
    src: "/images/virtual-tour/wide-panorama-preview.png",
    width: 905,
    height: 360,
    aspectRatio: 905 / 360,
    kind: "flat-preview",
    immersiveEligible: false,
    propertyMedia: false,
    note: "Wide flat image only. Aspect ratio is not 2:1, so it must not be used as a full spherical scene.",
  },
} as const satisfies Record<string, PanoramaAsset>;

export const immersiveDemoPanoramas = [panoramaAssets.demoLiving, panoramaAssets.demoKitchen] as const;
