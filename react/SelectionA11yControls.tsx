// DOM companions for pointer-driven R3F population/neuron primitives. WebGL
// objects never enter the browser accessibility tree, so hosts pair these real
// buttons with ExpandablePopulation/ExpandableNeurons rather than treating a
// mesh click handler as an accessible interaction.

import { useEffect, useState } from 'react';
import { safeDiagnosticText } from '../core/safeRuntime';
import { MAX_NEURON_POINTS } from './ExpandableNeurons';

export interface AccessiblePopulationOption {
  id: string;
  label: string;
  description?: string;
  disabled?: boolean;
}

export function PopulationA11yList({
  populations,
  selectedId,
  onSelect,
  label = 'Neural populations',
}: {
  populations: readonly AccessiblePopulationOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  label?: string;
}) {
  return (
    <section aria-label={safeDiagnosticText(label, 240)}>
      {populations.length === 0 ? (
        <p role="status">No populations are available.</p>
      ) : (
        <ul>
          {populations.map((population) => (
            <li key={population.id}>
              <button
                type="button"
                disabled={population.disabled}
                aria-pressed={selectedId === population.id}
                onClick={() => onSelect(population.id)}
                style={{ minWidth: 44, minHeight: 44 }}
              >
                {safeDiagnosticText(population.label, 240)}
              </button>
              {population.description && (
                <span> {safeDiagnosticText(population.description, 500)}</span>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export const DEFAULT_NEURON_A11Y_PAGE_SIZE = 50;
export const MAX_NEURON_A11Y_PAGE_SIZE = 200;

export function NeuronA11yPager({
  count,
  selectedIndex,
  onSelect,
  pageSize = DEFAULT_NEURON_A11Y_PAGE_SIZE,
  getLabel = (index) => `Neuron ${index + 1}`,
  label = 'Neurons',
}: {
  count: number;
  selectedIndex: number | null;
  onSelect: (index: number) => void;
  pageSize?: number;
  getLabel?: (index: number) => string;
  label?: string;
}) {
  if (!Number.isSafeInteger(count) || count < 0 || count > MAX_NEURON_POINTS) {
    throw new RangeError(`count must be a non-negative safe integer <= ${MAX_NEURON_POINTS}`);
  }
  if (selectedIndex !== null &&
      (!Number.isSafeInteger(selectedIndex) || selectedIndex < 0 || selectedIndex >= count)) {
    throw new RangeError('selectedIndex must reference an available neuron');
  }
  const safePageSize = Number.isSafeInteger(pageSize)
    ? Math.min(MAX_NEURON_A11Y_PAGE_SIZE, Math.max(1, pageSize))
    : DEFAULT_NEURON_A11Y_PAGE_SIZE;
  const pageCount = Math.max(1, Math.ceil(count / safePageSize));
  const [page, setPage] = useState(
    selectedIndex === null ? 0 : Math.floor(selectedIndex / safePageSize),
  );
  const currentPage = Math.min(page, pageCount - 1);
  useEffect(() => {
    if (selectedIndex !== null) setPage(Math.floor(selectedIndex / safePageSize));
    else setPage((value) => Math.min(value, pageCount - 1));
  }, [selectedIndex, safePageSize, pageCount]);
  const start = currentPage * safePageSize;
  const end = Math.min(count, start + safePageSize);

  return (
    <section aria-label={safeDiagnosticText(label, 240)}>
      {count === 0 ? (
        <p role="status">No neurons are available.</p>
      ) : (
        <>
          <ul>
            {Array.from({ length: end - start }, (_, offset) => start + offset).map((index) => (
              <li key={index}>
                <button
                  type="button"
                  aria-pressed={selectedIndex === index}
                  onClick={() => onSelect(index)}
                  style={{ minWidth: 44, minHeight: 44 }}
                >
                  {safeDiagnosticText(getLabel(index), 240)}
                </button>
              </li>
            ))}
          </ul>
          {pageCount > 1 && (
            <nav aria-label="Neuron pages">
              <p aria-live="polite">Neuron page {currentPage + 1} of {pageCount}</p>
              <button
                type="button"
                disabled={currentPage === 0}
                onClick={() => setPage((value) => Math.max(0, value - 1))}
                style={{ minWidth: 44, minHeight: 44 }}
              >
                Previous neurons
              </button>
              <button
                type="button"
                disabled={currentPage + 1 >= pageCount}
                onClick={() => setPage((value) => Math.min(pageCount - 1, value + 1))}
                style={{ minWidth: 44, minHeight: 44 }}
              >
                Next neurons
              </button>
            </nav>
          )}
        </>
      )}
    </section>
  );
}
