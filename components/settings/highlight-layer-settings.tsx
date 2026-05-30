"use client";

import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";

type HighlightLayer = {
  color: string;
  id: string;
  name: string;
};

const storageKey = "mutqin:similar-highlight-layers";

const defaultLayers: HighlightLayer[] = [
  { id: "universal_shared", name: "Shared by all", color: "#dcecdf" },
  { id: "partial_shared", name: "Shared by most", color: "#dbeaf7" },
  { id: "outlier", name: "Outlier", color: "#f5d6d0" },
  { id: "identity_marker", name: "Key difference", color: "#f3d7b2" },
];

export function HighlightLayerSettings() {
  const [layers, setLayers] = useState(defaultLayers);

  useEffect(() => {
    const saved = window.localStorage.getItem(storageKey);

    if (!saved) {
      return;
    }

    try {
      const parsed = JSON.parse(saved) as HighlightLayer[];
      if (Array.isArray(parsed) && parsed.length) {
        setLayers(parsed);
      }
    } catch {
      setLayers(defaultLayers);
    }
  }, []);

  useEffect(() => {
    window.localStorage.setItem(storageKey, JSON.stringify(layers));
  }, [layers]);

  function updateLayer(id: string, patch: Partial<HighlightLayer>) {
    setLayers((currentLayers) =>
      currentLayers.map((layer) => (layer.id === id ? { ...layer, ...patch } : layer)),
    );
  }

  return (
    <section className="rounded-[1.35rem] border border-line bg-paper p-4 shadow-soft">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-ink">Similar Verses highlight layers</h2>
          <p className="mt-1 text-sm leading-6 text-ink/60">
            Add, rename, or recolor the layers used for mutashabihat block highlights.
          </p>
        </div>
        <button
          className="flex size-10 shrink-0 items-center justify-center rounded-full bg-mist text-ink/55"
          onClick={() => setLayers(defaultLayers)}
          type="button"
        >
          <RotateCcw aria-hidden className="size-4" />
          <span className="sr-only">Reset highlight layers</span>
        </button>
      </div>

      <div className="mt-4 grid gap-2">
        {layers.map((layer) => (
          <div className="grid grid-cols-[2.75rem_1fr_2.5rem] items-center gap-2" key={layer.id}>
            <label
              className="flex size-11 items-center justify-center rounded-2xl border border-line bg-mist"
              style={{ backgroundColor: layer.color }}
            >
              <span className="sr-only">Layer color</span>
              <input
                className="size-7 opacity-0"
                onChange={(event) => updateLayer(layer.id, { color: event.target.value })}
                type="color"
                value={layer.color}
              />
            </label>
            <input
              className="h-11 rounded-2xl border border-line bg-mist px-3 text-sm font-bold text-ink outline-none focus:border-palm/35 focus:ring-2 focus:ring-palm/15"
              onChange={(event) => updateLayer(layer.id, { name: event.target.value })}
              value={layer.name}
            />
            <button
              className="flex size-10 items-center justify-center rounded-full bg-mist text-ink/45 transition hover:bg-red-50 hover:text-red-600"
              onClick={() =>
                setLayers((currentLayers) =>
                  currentLayers.filter((currentLayer) => currentLayer.id !== layer.id),
                )
              }
              type="button"
            >
              <Trash2 aria-hidden className="size-4" />
              <span className="sr-only">Remove layer</span>
            </button>
          </div>
        ))}
      </div>

      <button
        className="mt-3 flex min-h-11 w-full items-center justify-center gap-2 rounded-2xl bg-ink px-4 text-sm font-bold text-white"
        onClick={() =>
          setLayers((currentLayers) => [
            ...currentLayers,
            {
              color: "#ece7d5",
              id: `custom-${Date.now()}`,
              name: "Custom layer",
            },
          ])
        }
        type="button"
      >
        <Plus aria-hidden className="size-4" />
        Add layer
      </button>
    </section>
  );
}
