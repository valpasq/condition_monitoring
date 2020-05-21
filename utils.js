


// 'Legacy' band renaming
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
exports.preprocess457 = preprocess457

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
exports.preprocess8 = preprocess8

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
exports.cloudScore = cloudScore

var addCloudScore = function(image) {
      // Invert the cloudscore so 1 is least cloudy, and rename the band.
      var score = cloudScore(image.select(LTS_NAMES));
      score = ee.Image(1).subtract(score).select([0], ['cloudscore']);
      return image.addBands(score);
// REF: https://gis.stackexchange.com/questions/280400/
// cloud-cover-percentage-in-google-earth-engine 
}
exports.addCloudScore = addCloudScore

var maskCloudScore = function(image) {
  var qa = image.select('cloudscore');

  var mask = qa.gte(0.8);
  return image.updateMask(mask)
      .copyProperties(image, ["system:time_start", "WRS_PATH", "WRS_ROW"]);
}
// SOURCE: https://gis.stackexchange.com/questions/280400/
// cloud-cover-percentage-in-google-earth-engine  
exports.maskCloudScore = maskCloudScore

var spectralTransforms = function(img){
  // make sure index string in upper case
  var index = DEPENDENT.toUpperCase();

  var dict = {
    blue: img.select("blue").divide(10000),
    green: img.select("green").divide(10000), // moved divide here
    red: img.select("red").divide(10000),
    nir: img.select("nir").divide(10000),
    swir1: img.select("swir1").divide(10000),
    swir2: img.select("swir2").divide(10000),
  };
  
  var indexImg;
  switch (index){
    case 'NBR':
      indexImg = img.normalizedDifference(['nir', 'swir2'])
        .rename("nbr");
      break;
    case 'NDMI':
      indexImg = img.normalizedDifference(['nir', 'swir1'])
        .rename("ndmi");
      break;
    case 'NDVI':
      indexImg = img.normalizedDifference(['nir', 'red'])
        .rename("ndvi");
      break;
    case 'NDSI':
      indexImg = img.normalizedDifference(['green', 'swir1'])
        .rename("ndsi");
      break;
    case 'EVI':
      indexImg = img.expression(
          '2.5 * ((NIR - RED) / (NIR + 6 * RED - 7.5 * BLUE + 1))', 
          {
            'NIR': img.select('nir'),
            'RED': img.select('red'),
            'BLUE': img.select('blue')
        }).rename("evi");
      break;
    case 'TCB':
      indexImg = img.expression("0.2043*blue + 0.4158*green + 0.5524*red + 0.5741*nir + 0.3124*swir1 + 0.2303*swir2", dict)
        .rename("tcb");
      break;
    case 'TCG':
      indexImg = img.expression("-0.1603*blue - 0.2819*green - 0.4934*red + 0.7940*nir - 0.0002*swir1 - 0.1446*swir2", dict)
        .rename("tcg");
      break;
    case 'TCW':
      indexImg = img.expression("0.0315*blue + 0.2021*green + 0.3102*red + 0.1594*nir - 0.6806*swir1 - 0.6109*swir2", dict)
        .rename("tcw");
      break;
    case 'SR':
      indexImg = img.select('nir').divide(img.select('red'))
        .rename("sr");
      break;

    default:
      print('The index you provided is not supported');
  }

  return indexImg
    .copyProperties(img, ["system:time_start", "WRS_PATH", "WRS_ROW"]);
}
exports.spectralTransforms = spectralTransforms

var getNames = function(base, list) {
  return ee.List(list).map(function(i) { 
    return ee.String(base).cat(ee.Number(i).int());
  });
};
exports.getNames = getNames

var addConstant = function(image) {
  return image.addBands(ee.Image(1));
};
exports.addConstant = addConstant

var addTime = function(image) {
  // Compute time in fractional years since the epoch.
  var date = ee.Date(image.get('system:time_start'));
  var years = date.difference(ee.Date('1970-01-01'), 'year');
  var timeRadians = ee.Image(years.multiply(2 * Math.PI));
  return image.addBands(timeRadians.rename('t').float());
};
exports.addTime = addTime

var addHarmonics = function(freqs) {
  return function(image) {
    // Make an image of frequencies.
    var frequencies = ee.Image.constant(freqs);
    // This band should represent time in radians.
    var time = ee.Image(image).select('t');
    // Get the cosine terms.
    var cosines = time.multiply(frequencies).cos()
      .rename(cosNames);
    // Get the sin terms.
    var sines = time.multiply(frequencies).sin()
      .rename(sinNames);
    return image.addBands(cosines).addBands(sines);
  };
};
exports.addHarmonics = addHarmonics

var getCoeffs = function(feature) {
  var collectionScene = ee.ImageCollection.fromImages(feature.get('images'));
  
  // Calculate number of observations per pixel
  var numObs = collectionScene.count().select(0).rename('nobs')
  var crs = collectionScene.first().projection().crs()
  
  // Add constant, time, and coefficients
  var harmonicLandsat = collectionScene.select(DEPENDENT)
    .map(addConstant)
    .map(addTime)
    .map(addHarmonics(harmonicFrequencies));
    
  // The output of the regression reduction is a 4x1 array image
  var harmonicTrend = harmonicLandsat
    .select(independents.add(DEPENDENT))
    .reduce(ee.Reducer.linearRegression(independents.length(), 1));
  
  // Turn the array image into a multi-band image of coefficients
  var harmonicTrendCoefficients = harmonicTrend.select('coefficients')
    .arrayProject([0])
    .arrayFlatten([independents]);
  
  // Compute fitted values
  var fittedHarmonic = harmonicLandsat.map(function(image) {
    return image.addBands(
      image.select(independents)
        .multiply(harmonicTrendCoefficients)
        .reduce('sum')
        .rename('fitted'));
      });
  
  // Calculate residuals
  var withResiduals = fittedHarmonic.map(function(image) {
    var residuals = image.select(DEPENDENT).subtract(image.select('fitted'))
        .rename('residual');
    var residualsSquared = residuals.pow(2).rename('residualSquared');
    
    return image.addBands([residuals, residualsSquared]);
  });
  
  // Calculate model RMSE
  var rmse = withResiduals.select('residualSquared')
    .mean().sqrt().rename('rmse');
  
  harmonicTrendCoefficients = harmonicTrendCoefficients
    .addBands([rmse, numObs]);
    
  var outputProperties = ee.Dictionary({
    'system:time_start': ee.Date(START_YEAR+'-01-01').millis(),
    'system:time_end': ee.Date(END_YEAR+'-01-01').millis(),
    'spectral_band': DEPENDENT,
    'year_start': START_YEAR,
    'year_end': END_YEAR,
    'version': VERSION,
    'harmonics': HARMONICS,
    'time_series': TS,
    'WRS_PATH': feature.get('PATH'),
    'WRS_ROW': feature.get('ROW')
});
  
  return harmonicTrendCoefficients//.reproject(crs)
    .setMulti(outputProperties);
};
exports.getCoeffs = getCoeffs

