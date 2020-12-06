# [Harmonic baseline condition monitoring](https://valpasq.github.io/condition_monitoring/harmonics/)

The tools and workflow hosted in this repository are designed to support spatial and temporally consistent Landsat-based condition change monitoring for retrospective disturbance assessment at regional to national scales.
## Overview
Detecting changes in surface conditions requires establishing reference or "baseline" conditions to be used for comparison. Our approach uses time series of [Landsat](https://www.usgs.gov/core-science-systems/nli/landsat) observations to estimate a series of harmonic baseline models that account for seasonal variability in vegetation conditions and builds on [previously published methods](https://www.mdpi.com/1999-4907/8/8/275). This ensemble of harmonic models is used to estimate the average anomaly in Greenness for a given acquisition date. By then aggregating these average anomalies over a specified monitoring period (i.e. summer growing season), a relatively stable and robust annual estimate of change in Greenness can be produced. Spatial smoothing and thresholding by anomaly magnitude improves visualization of disturbance patches, and the resulting map products can be used to compare disturbances across years.

___

## Workflow
Our workflow can be used to process Landsat time series and generate mean annual Tasseled Cap Greenness anomalies over large spatial extents using [Google Earth Engine](https://earthengine.google.com/).

Earth Engine users can add this repository with Reader access [here](https://code.earthengine.google.com/?accept_repo=users/valeriepasquarella/condition_monitoring).

The scripts in this repository include:

* `workflow_by_state/`
    * `1S_v7_baseline_generator` - Generate harmonic baseline models using fixed-length moving window (default: 5-year models)
    * `2S_v7_predict_monitor` - Estimate average Greenness anomalies for dates within monitoring period (default: May-September)
    * `3S_v7_assessments_combine` - Combine results across orbital Paths
    * `4S_v7_visualization` - Spatially smooth and threshold for visualization
* `app/`
    * `APP_v7_disturbance_atlas` - Interactive mapping App with select by year
* `utils.js` - Utility functions shared across scripts

While these scripts are expected to provide a useful starting point for those seeking to replicate or build on our methods, users should carefully review all paths, inputs, and other parameter specifications in order to tune to their own study areas. See [Docs](https://valpasq.github.io/condition_monitoring/harmonics/) for addition information.

___

## Products
As proof of concept, we have piloted the harmonic baseline monitoring workflow for a selection of Northeastern states within USFS Region 9 and generated annual change assessments for 2010-2020 using a May 1 through September 30 monitoring period.

To view these preliminary results, visit our [Vegetation Disturbance Atlas App](https://valeriepasquarella.users.earthengine.app/view/condition-monitoring-disturbance-atlas).


___

## Related Publications
Pasquarella, V. J., Mickley, J. G., Barker Plotkin, A., MacLean, R. G., Anderson, R. M., Brown, L. M., Wagner, D. L., Singer, M. S., and Bagchi, R. (in review). Assessing a Landsat-based harmonic modeling approach for forest condition monitoring using defoliator abundance and defoliation measurements.

Pasquarella, V. J., Bradley, B. A., & Woodcock, C. E. (2017). [Near-real-time monitoring of insect defoliation using Landsat time series](https://www.mdpi.com/1999-4907/8/8/275). _Forests_, 8(8), 275.

Pasquarella, V. J., Elkinton, J. S., & Bradley, B. A. (2018). [Extensive gypsy moth defoliation in Southern New England characterized using Landsat satellite observations](https://link.springer.com/article/10.1007/s10530-018-1778-0). _Biological Invasions_, 20(11), 3047-3053.
