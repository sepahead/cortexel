/** One package-private nominal identity shared by ESM and CommonJS declarations. */
declare const FIGURE_RESULT_NOMINAL_IDENTITY: unique symbol;
interface FigureResultNominalBrand {
    readonly [FIGURE_RESULT_NOMINAL_IDENTITY]: true;
}

export type { FigureResultNominalBrand };
