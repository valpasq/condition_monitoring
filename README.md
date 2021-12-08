# [Harmonic condition monitoring](https://valpasq.github.io/condition_monitoring/)

[![DOI](https://zenodo.org/badge/DOI/10.5281/zenodo.4565535.svg)](https://doi.org/10.5281/zenodo.4565535)

The tools and workflow described in these docs and hosted in the associated repositories on [GitHub](https://github.com/valpasq/condition_monitoring) and [Earth Engine](https://code.earthengine.google.com/?accept_repo=users/valeriepasquarella/condition_monitoring) are designed to support spatially and temporally consistent Landsat-based condition change monitoring for retrospective disturbance assessment at regional to national scales.
___

## Overview
Detecting changes in surface conditions requires establishing reference or "baseline" conditions to be used for comparison. Our approach uses time series of [Landsat](https://www.usgs.gov/core-science-systems/nli/landsat) observations to estimate a series of harmonic baseline models that account for seasonal variability in vegetation conditions and builds on [previously published methods](https://www.mdpi.com/1999-4907/8/8/275). An ensemble of the _n_ preceding harmonic models is used to estimate the average anomaly in Greenness for a given acquisition date. By then aggregating average anomalies over a specified monitoring period (i.e. summer growing season), a relatively stable and robust annual estimate of change in Greenness can be produced. Spatial smoothing and thresholding by anomaly magnitude improves visualization of disturbance patches, and the resulting map products can be used to compare disturbances across years.


___

## Workflow
Our workflow is designed to generate estimates of mean annual Tasseled Cap Greenness anomalies over large spatial extents using [Google Earth Engine](https://earthengine.google.com/). The original workflow was based on Landsat Collection 1 (C1) but has recently been updated for use with [Collection 2 (C2)]((https://www.usgs.gov/core-science-systems/nli/landsat/landsat-collection-2) Surface Reflectance products [available in Earth Engine](https://developers.google.com/earth-engine/datasets/catalog/landsat).

Earth Engine users can add this repository with Reader access [here](https://code.earthengine.google.com/?accept_repo=users/valeriepasquarella/condition_monitoring).

The scripts in this repository include:

* `app/`
    * `APP_condition_monitoring_explorer` (Deprecated)
    * `APP_condition_monitoring_explorer_c2` - Interactive mapping app for exploring condition monitoring results. All analysis has been updated to use Landsat Collection 2 for both baseline fitting and monitoring.
* `workflow_by_state/`
    * collection_1 (deprecated)
    * collection_2
        * `1_baseline_generator_c2` - Generate harmonic baseline models using fixed-length moving window (default: 5-year models).
        * `2_monitor_assess_batch_c2` - Estimate average Greenness anomalies for dates within monitoring period (default: May 1 - September 30) and combine results across Landsat orbital Paths. Batch version can be used to queue tasks for multiple states and/or years.
       * `3_visualization` - Spatially smooth and threshold map results for visualization.
* `utils.js` - Utility functions shared across scripts. Includes both C1 and C2 processing functions.


While these scripts are expected to provide a useful starting point for those seeking to replicate or build on our methods, users should carefully review all paths, inputs, and other parameter specifications in order to tune to their own study areas.

_Note: Current scripts have been developed and tested for US State geographies, and example products are available for select Northeastern states within USFS Region 9. However, assets are currently not publicly shared. To access the assets associated with these scripts, please contact valpasq@bu.edu and request to join our Google Group by clicking "Ask to Join Group" [here](https://groups.google.com/g/harmonic-condition-monitoring)._

___

## Products
As proof of concept, we have piloted the harmonic baseline monitoring workflow for a selection of Northeastern states within USFS Region 9 and generated annual change assessments for 1995-2020 using a May 1 through September 30 monitoring period.

To interactively view these preliminary results, visit our [Condition Monitoring Explorer App](https://valeriepasquarella.users.earthengine.app/view/condition-monitoring-explorer).

Previous releases of this app displayed results based on Landsat Collection 1 inputs. All analysis has been re-run using the Landsat Collection 2 workflow and results have been updated (2021-12-05).


___

## Related Publications

Pasquarella, V. J., Bradley, B. A., & Woodcock, C. E. (2017). [Near-real-time monitoring of insect defoliation using Landsat time series](https://www.mdpi.com/1999-4907/8/8/275). _Forests_, 8(8), 275.

Pasquarella, V. J., Elkinton, J. S., & Bradley, B. A. (2018). [Extensive gypsy moth defoliation in Southern New England characterized using Landsat satellite observations](https://link.springer.com/article/10.1007/s10530-018-1778-0). _Biological Invasions_, 20(11), 3047-3053.

Pasquarella, V. J., Mickley, J. G., Barker Plotkin, A., MacLean, R. G., Anderson, R. M., Brown, L. M., Wagner, D. L., Singer, M. S., and Bagchi, R. (2021). [Predicting defoliator abundance and defoliation measurements using Landsat-based condition scores](https://doi.org/10.1002/rse2.211).
_Remote Sensing in Ecology and Conservation_.
