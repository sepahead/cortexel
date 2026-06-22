// usePopulationExpand — reusable selection/hover state for population inspection.
//
// In Cortexel, a population is a glowing voxel cube that EXPANDS into its
// constituent neurons when clicked/tapped (the "plasticity-tab" interaction).
// This hook owns the minimal state behind that gesture and is THREE-free.
//
// Some scenes (e.g. NeuralScene) already own `selectedPop`/`hoveredPop` at the
// root and prop-drill it. To avoid creating a second competing state owner, the
// hook accepts an optional CONTROLLED override: pass the existing state + setters
// and the hook becomes a thin typed accessor over them; omit it and the hook
// self-manages with `useState`.

import { useCallback, useState } from 'react';

export interface PopulationExpandController {
  selectedPopId: string | null;
  hoveredPopId: string | null;
  setSelectedPopId: (id: string | null) => void;
  setHoveredPopId: (id: string | null) => void;
}

export interface PopulationExpand extends PopulationExpandController {
  isSelected: (id: string) => boolean;
  isHovered: (id: string) => boolean;
  isAnySelected: () => boolean;
  /** Toggle selection: selecting an already-selected id clears it. */
  toggleSelected: (id: string) => void;
  reset: () => void;
}

export function usePopulationExpand(
  controlled?: PopulationExpandController,
): PopulationExpand {
  const [localSelected, setLocalSelected] = useState<string | null>(null);
  const [localHovered, setLocalHovered] = useState<string | null>(null);

  const selectedPopId = controlled ? controlled.selectedPopId : localSelected;
  const hoveredPopId = controlled ? controlled.hoveredPopId : localHovered;
  const setSelectedPopId = controlled
    ? controlled.setSelectedPopId
    : setLocalSelected;
  const setHoveredPopId = controlled
    ? controlled.setHoveredPopId
    : setLocalHovered;

  const toggleSelected = useCallback(
    (id: string) => setSelectedPopId(selectedPopId === id ? null : id),
    [selectedPopId, setSelectedPopId],
  );
  const reset = useCallback(() => {
    setSelectedPopId(null);
    setHoveredPopId(null);
  }, [setSelectedPopId, setHoveredPopId]);

  return {
    selectedPopId,
    hoveredPopId,
    setSelectedPopId,
    setHoveredPopId,
    isSelected: (id) => selectedPopId === id,
    isHovered: (id) => hoveredPopId === id,
    isAnySelected: () => selectedPopId !== null,
    toggleSelected,
    reset,
  };
}
