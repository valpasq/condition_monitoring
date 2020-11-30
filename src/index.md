# Harmonic baseline condition monitoring
___

## Overview
Detecting changes in surface conditions requires establishing reference or "baseline" conditions to be used for comparison. Our approach uses time series of Landsat observations to estimate a series of harmonic baseline models that account for seasonal variability in vegetation conditions. This ensemble of models, each representing a fixed moving window temporal interval, are used to estimate  average anomalies in Greenness. By then averaging these deviations over a specified monitoring period (i.e. summer growing season), a relatively stable and robust annual estimate of change in Greenness can be produced. The resulting products can be used to compare disturbances across years, and spatial smoothing and thresholding by anomaly magnitude improves visualization of disturbance patches.

The tools and workflows described in this Guide are designed to support spatial and temporally consistent Landsat-based condition change monitoring for retrospective disturbance assessment at regional to national scales.

___

## Workflow
Our workflow can be used to process Landsat time series and generate mean annual Tasseled Cap Greenness anomalies over large spatial extents. [add Earth Engine repo here]

* `1S_v7_baseline_generator` - Generate harmonic baseline models using fixed-length moving window (default: 5-year models)
* `2S_v7_predict_monitor` - Estimate average Greenness anomalies for dates within monitoring period (default: May-September)
* `3S_v7_assessments_combine` - Combine results across orbital Paths
* `4S_v7_visualization` - Spatially smooth and threshold for visualization
* `4S_v7_visualization_app` - Interactive mapping App with select by year
* `utils.js` - Utility functions shared across scripts

___

## Products
Though this approach can be used to generate near-real-time results where newly observed imagery is compared to the ensemble of baseline model predictions, the relative noisiness of single-date imagery including atmospheric effects and cloud and cloud shadow masking requires more careful expert interpretation. However, averaging across multiple acquisition dates generates a more stable estimate of spectral change that can be used to generate a series of comparable retrospective assessments of annual changes in vegetation condition.


To view preliminary results, visit our [Disturbance Atlas App](https://valeriepasquarella.users.earthengine.app/view/condition-monitoring-disturbance-atlas).

___
