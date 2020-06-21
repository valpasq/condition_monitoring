// |
// | Landsat Time Series Harmonic Baseline Generator
// | [valpasq@bu.edu], 2020
// |
// |


var L8_BANDS = ['B2', 'B3', 'B4', 'B5',  'B6',  'B7', 'B10']; // Landsat OLI bands
var L457_BANDS = ['B1', 'B2', 'B3', 'B4',  'B5',  'B7', 'B6']; // Landsat TM/ETM+ bands
var LTS_NAMES = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2', 'temp']; // Common names


var preprocess457 = function(image) {
  var mask1 = image.select(['pixel_qa']).eq(66) // Clear land
              .or(image.select(['pixel_qa']).eq(68)); // Clear water
  var mask2 = image.mask().reduce('min');
  var mask3 = image.select(['B1', 'B2', 'B3', 'B4',  'B5',  'B7']).gt(0).and(
            image.select(['B1', 'B2', 'B3', 'B4',  'B5',  'B7']).lt(10000))
            .reduce('min');
  
  return image.updateMask(mask1.and(mask2).and(mask3))
    .select(L457_BANDS).rename(LTS_NAMES)
    .copyProperties(image, ["system:time_start", "WRS_PATH", "WRS_ROW"]);
};


var preprocess8 = function(image) {
  var mask1 = image.select(['pixel_qa']).eq(322) // Clear land
              .or(image.select(['pixel_qa']).eq(324)); // Clear water
  var mask2 = image.mask().reduce('min');
  var mask3 = image.select(['B2', 'B3', 'B4', 'B5',  'B6',  'B7']).gt(0).and(
            image.select(['B2', 'B3', 'B4', 'B5',  'B6',  'B7']).lt(10000))
            .reduce('min');
               
  return image.updateMask(mask1.and(mask2).and(mask3))
      .select(L8_BANDS).rename(LTS_NAMES) // Map legacy band names
      .copyProperties(image, ["system:time_start", "WRS_PATH", "WRS_ROW"]);
};


var cloudScore = function(image) {
  // A helper to apply an expression and linearly rescale the output.
  var rescale = function(image, exp, thresholds) {
    return image.expression(exp, {image: image})
        .divide(10000) // need to divide by 10000 (SR)
        .subtract(thresholds[0]).divide(thresholds[1] - thresholds[0]);
  };

  // Compute several indicators of cloudyness and take the minimum of them.
  var score = ee.Image(1.0);
  
  // Clouds are reasonably bright in the blue band.
  score = score.min(rescale(image, 'image.blue', [0.1, 0.3]));

  // Clouds are reasonably bright in all visible bands.
  score = score.min(rescale(image, 'image.red + image.green + image.blue', [0.2, 0.8]));

  // Clouds are reasonably bright in all infrared bands.
  score = score.min(
      rescale(image, 'image.nir + image.swir1 + image.swir2', [0.3, 0.8]));

  // Clouds are reasonably cool in temperature.
  score = score.min(rescale(image, 'image.temp', [300, 290]));

  // However, clouds are not snow.
  var ndsi = image.normalizedDifference(['green', 'swir1']);
  return score.min(rescale(ndsi, 'image', [0.8, 0.6]));

}; 


var addCloudScore = function(image) {
      // Invert the cloudscore so 1 is least cloudy, and rename the band.
      var score = cloudScore(image.select(LTS_NAMES));
      score = ee.Image(1).subtract(score).select([0], ['cloudscore']);
      return image.addBands(score);
// REF: https://gis.stackexchange.com/questions/280400/
// cloud-cover-percentage-in-google-earth-engine 
}


var maskCloudScore = function(image) {
  var qa = image.select('cloudscore');

  var mask = qa.gte(0.8);
  return image.updateMask(mask)
      .copyProperties(image, ["system:time_start", "WRS_PATH", "WRS_ROW"]);
}
// SOURCE: https://gis.stackexchange.com/questions/280400/
// cloud-cover-percentage-in-google-earth-engine  


exports = {
  preprocess457: preprocess457,
  preprocess8: preprocess8,
  cloudScore: cloudScore,
  addCloudScore: addCloudScore,
  maskCloudScore: maskCloudScore
}
