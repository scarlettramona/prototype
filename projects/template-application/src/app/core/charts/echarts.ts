/**
 * The parts of ECharts this app uses. Importing from `echarts/core` and
 * registering pieces individually keeps the bundle to what's listed here; add
 * a chart type or component here before using it in a chart's options.
 *
 * Loaded lazily by `provideEchartsCore()` in `app.config.ts`, so ECharts is
 * only downloaded the first time a chart renders.
 *
 * `DataZoomComponent` covers both the slider (navigator) and inside (drag/wheel)
 * zoom. `BrushComponent` is driven programmatically (no toolbox).
 */
import * as echarts from 'echarts/core';
import { BarChart, LineChart, PieChart, ScatterChart } from 'echarts/charts';
import {
  BrushComponent,
  DataZoomComponent,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TitleComponent,
  TooltipComponent,
} from 'echarts/components';
import { LabelLayout, UniversalTransition } from 'echarts/features';
import { CanvasRenderer } from 'echarts/renderers';

echarts.use([
  BarChart,
  LineChart,
  PieChart,
  ScatterChart,
  BrushComponent,
  DataZoomComponent,
  DatasetComponent,
  GridComponent,
  LegendComponent,
  MarkAreaComponent,
  MarkLineComponent,
  TitleComponent,
  TooltipComponent,
  LabelLayout,
  UniversalTransition,
  CanvasRenderer,
]);

export { echarts };
