"use client";

import { useMemo, useState } from "react";
import { immersiveDemoPanoramas, panoramaAssets } from "@/data/panoramaAssets";
import type { VirtualTourScene } from "@/data/virtualTour";
import { MarzipanoViewer } from "./MarzipanoViewer";

function createDemoScene(id: "demo-living" | "demo-kitchen"): VirtualTourScene {
  const asset = id === "demo-kitchen" ? panoramaAssets.demoKitchen : panoramaAssets.demoLiving;
  return {
    id: asset.id,
    title: asset.label,
    eyebrow: "360 VIEWER QA",
    description: asset.note,
    panorama: asset.src,
    panoramaReady: asset.immersiveEligible,
    mediaKind: "development-demo",
    sourceNote: asset.note,
    panoramaWidth: asset.width,
    fallbackImage: panoramaAssets.widePreview.src,
    initialView: { yaw: 0, pitch: 0, fov: 1.25 },
    hotspots: [],
  };
}

export function PanoramaDemoLab() {
  const [demoId, setDemoId] = useState<"demo-living" | "demo-kitchen">("demo-living");
  const scene = useMemo(() => createDemoScene(demoId), [demoId]);

  return (
    <section className="vt-demo-lab site-container" aria-labelledby="vt-demo-heading">
      <div className="vt-demo-lab__intro">
        <div>
          <span className="micro">DEVELOPMENT QA ONLY</span>
          <h2 id="vt-demo-heading">360 viewer test bench</h2>
        </div>
        <p>
          These supplied 2:1 panoramas are used only to validate the immersive viewer. They are not
          Tejjora Lake View property photography and never replace the hotel&apos;s real scene fallbacks.
        </p>
      </div>

      <div className="vt-demo-lab__switch" role="group" aria-label="Choose development panorama">
        {immersiveDemoPanoramas.map((asset) => (
          <button
            key={asset.id}
            type="button"
            data-active={demoId === asset.id ? "true" : "false"}
            onClick={() => setDemoId(asset.id)}
          >
            {asset.id === "demo-living" ? "Living-room demo" : "Kitchen demo"}
          </button>
        ))}
      </div>

      <MarzipanoViewer scene={scene} onSceneChange={() => {}} />

      <div className="vt-demo-lab__audit">
        <span>2048 × 1024</span>
        <span>2:1 equirectangular candidate</span>
        <span>Not Tejjora property media</span>
      </div>
    </section>
  );
}
