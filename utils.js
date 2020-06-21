/**** Start of imports. If edited, may not auto-convert in the playground. ****/
var wrs2 = ee.FeatureCollection("projects/google/wrs2_descending"),
    image = ee.Image("projects/sites-project/conditionassessment_experiments_v5-2/features-v5-2_tcg_2000-2010_h13_full");
/***** End of imports. If edited, may not auto-convert in the playground. *****/
// |
// | Landsat Time Series Harmonic Baseline Generator
// | [valpasq@bu.edu], 2020
// |
// |
// | This script generates harmonic baseline models for a user-specified
// | roi. Baseline parameters include time period, vegetation/spectral 
// | index, harmonic frequencies, limited or full use of Landsat 7
// | observations, and a scene-based cloud cover threshold. Results are
// | generated per Path and are exported to an Image Collection. 

var VERSION = '6-0';

// Specify study area polygon(s)
var ROI_FN = 'projects/ee-valeriepasquarella/assets/simplified_southernNE'
var roi = ee.FeatureCollection(ROI_FN).geometry()

// Specify output collection (empty collection created using Assets Manager)
var OUTPUT_COLLECTION = 'projects/sites-project/baselines_v5-3_by_path/'

// ---------------------------------- Model Parameters ---------------------------------- 

var DEPENDENT = 'tcg';  // Select spectral transform   
var HARMONICS = 'h13';  // 'h12' => 12 & 6 month, 'h13' => 12 & 4 month

var START_YEAR = 2000;  // Starts 01-01
var END_YEAR = 2010;    // Ends 12-31

var TS = 'full';        // 'full' or '16d' (limits L7 use)
var CC_THRESH = 80;     // Maximum cloud cover for baseline inputs

var OUTPUT_MULTIPLIER = 10000; // To convert asset output to int

// ---------------------------------- Model Setup ---------------------------------- 

var experiment_name = DEPENDENT + '_' + START_YEAR + '-' + END_YEAR + '_' + HARMONICS + '_' + TS;
var output_name = OUTPUT_COLLECTION + 'features-v' + VERSION + '_' + experiment_name;

// Dictionary for asset properties
var outputProperties = ee.Dictionary({
    'system:time_start': ee.Date(START_YEAR+'-01-01').millis(),
    'system:time_end': ee.Date(END_YEAR+'-12-31').millis(),
    'spectral_band': DEPENDENT,
    'year_start': START_YEAR,
    'year_end': END_YEAR,
    'version': VERSION,
    'harmonics': HARMONICS,
    'time_series': TS,
    'name': experiment_name
});


// var L8_BANDS = ['B2', 'B3', 'B4', 'B5',  'B6',  'B7', 'B10']; // Landsat OLI bands
// var L457_BANDS = ['B1', 'B2', 'B3', 'B4',  'B5',  'B7', 'B6']; // Landsat TM/ETM+ bands
// var LTS_NAMES = ['blue', 'green', 'red', 'nir', 'swir1', 'swir2', 'temp']; // Common names


// var preprocess457 = function(image) {
//   var mask1 = image.select(['pixel_qa']).eq(66) // Clear land
//               .or(image.select(['pixel_qa']).eq(68)); // Clear water
//   var mask2 = image.mask().reduce('min');
//   var mask3 = image.select(['B1', 'B2', 'B3', 'B4',  'B5',  'B7']).gt(0).and(
//             image.select(['B1', 'B2', 'B3', 'B4',  'B5',  'B7']).lt(10000))
//             .reduce('min');
  
//   return image.updateMask(mask1.and(mask2).and(mask3))
//     .select(L457_BANDS).rename(LTS_NAMES)
//     .copyProperties(image, ["system:time_start", "WRS_PATH", "WRS_ROW"]);
// };


// var preprocess8 = function(image) {
//   var mask1 = image.select(['pixel_qa']).eq(322) // Clear land
//               .or(image.select(['pixel_qa']).eq(324)); // Clear water
//   var mask2 = image.mask().reduce('min');
//   var mask3 = image.select(['B2', 'B3', 'B4', 'B5',  'B6',  'B7']).gt(0).and(
//             image.select(['B2', 'B3', 'B4', 'B5',  'B6',  'B7']).lt(10000))
//             .reduce('min');
               
//   return image.updateMask(mask1.and(mask2).and(mask3))
//       .select(L8_BANDS).rename(LTS_NAMES) // Map legacy band names
//       .copyProperties(image, ["system:time_start", "WRS_PATH", "WRS_ROW"]);
// };


// var cloudScore = function(image) {
//   // A helper to apply an expression and linearly rescale the output.
//   var rescale = function(image, exp, thresholds) {
//     return image.expression(exp, {image: image})
//         .divide(10000) // need to divide by 10000 (SR)
//         .subtract(thresholds[0]).divide(thresholds[1] - thresholds[0]);
//   };

//   // Compute several indicators of cloudyness and take the minimum of them.
//   var score = ee.Image(1.0);
  
//   // Clouds are reasonably bright in the blue band.
//   score = score.min(rescale(image, 'image.blue', [0.1, 0.3]));

//   // Clouds are reasonably bright in all visible bands.
//   score = score.min(rescale(image, 'image.red + image.green + image.blue', [0.2, 0.8]));

//   // Clouds are reasonably bright in all infrared bands.
//   score = score.min(
//       rescale(image, 'image.nir + image.swir1 + image.swir2', [0.3, 0.8]));

//   // Clouds are reasonably cool in temperature.
//   score = score.min(rescale(image, 'image.temp', [300, 290]));

//   // However, clouds are not snow.
//   var ndsi = image.normalizedDifference(['green', 'swir1']);
//   return score.min(rescale(ndsi, 'image', [0.8, 0.6]));

// }; 


// var addCloudScore = function(image) {
//       // Invert the cloudscore so 1 is least cloudy, and rename the band.
//       var score = cloudScore(image.select(LTS_NAMES));
//       score = ee.Image(1).subtract(score).select([0], ['cloudscore']);
//       return image.addBands(score);
// // REF: https://gis.stackexchange.com/questions/280400/
// // cloud-cover-percentage-in-google-earth-engine 
// }


// var maskCloudScore = function(image) {
//   var qa = image.select('cloudscore');

//   var mask = qa.gte(0.8);
//   return image.updateMask(mask)
//       .copyProperties(image, ["system:time_start", "WRS_PATH", "WRS_ROW"]);
// }
// // SOURCE: https://gis.stackexchange.com/questions/280400/
// // cloud-cover-percentage-in-google-earth-engine  


var spectralTransforms = function(img){
  // make sure index string in upper case
  var index = DEPENDENT.toUpperCase();

  var scaled = img.divide(10000)
  
  var dict = {
    blue: scaled.select("blue"),
    green: scaled.select("green"),
    red: scaled.select("red"),
    nir: scaled.select("nir"),
    swir1: scaled.select("swir1"),
    swir2: scaled.select("swir2"),
  };
  
  var indexImg;
  switch (index){
    case 'NBR':
      indexImg = scaled.normalizedDifference(['nir', 'swir2'])
        .rename("nbr");
      break;
    case 'NDMI':
      indexImg = scaled.normalizedDifference(['nir', 'swir1'])
        .rename("ndmi");
      break;
    case 'NDVI':
      indexImg = scaled.normalizedDifference(['nir', 'red'])
        .rename("ndvi");
      break;
    case 'NDSI':
      indexImg = scaled.normalizedDifference(['green', 'swir1'])
        .rename("ndsi");
      break;
    case 'EVI':
      indexImg = scaled.expression("2.5 * ((nir - red) / (nir + 6 * red - 7.5 * blue + 1))", dict)
        .rename("evi");
      break;
    case 'TCB':
      indexImg = scaled.expression("0.2043*blue + 0.4158*green + 0.5524*red + 0.5741*nir + 0.3124*swir1 + 0.2303*swir2", dict)
        .rename("tcb");
      break;
    case 'TCG':
      indexImg = scaled.expression("-0.1603*blue - 0.2819*green - 0.4934*red + 0.7940*nir - 0.0002*swir1 - 0.1446*swir2", dict)
        .rename("tcg");
      break;
    case 'TCW':
      indexImg = scaled.expression("0.0315*blue + 0.2021*green + 0.3102*red + 0.1594*nir - 0.6806*swir1 - 0.6109*swir2", dict)
        .rename("tcw");
      break;
    case 'SR':
      indexImg = scaled.select('nir').divide(scaled.select('red'))
        .rename("sr");
      break;

    default:
      print('The index you provided is not supported');
  }

  return indexImg
    .copyProperties(img, ["system:time_start", "WRS_PATH", "WRS_ROW"]);
}


var getNames = function(base, list) {
  return ee.List(list).map(function(i) { 
    return ee.String(base).cat(ee.Number(i).int());
  });
};


var addConstant = function(image) {
  return image.addBands(ee.Image(1));
};


var addTime = function(image) {
  // Compute time in fractional years since the epoch.
  var date = ee.Date(image.get('system:time_start'));
  var years = date.difference(ee.Date('1970-01-01'), 'year');
  var timeRadians = ee.Image(years.multiply(2 * Math.PI));
  return image.addBands(timeRadians.rename('t').float());
};


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


var getCoeffs = function(feature) {
  var collectionScene = ee.ImageCollection.fromImages(feature.get('images'));
  
  // Calculate number of observations per pixel
  var numObs = collectionScene.count().select(0).rename('nobs')
  var crs = collectionScene.first().projection().crs()
  
  // Add constant, time, and coefficients
  var harmonicLandsat = collectionScene.select(DEPENDENT)
    .map(addConstant)
    .map(addTime)
    .map(addHarmonics(harmonicFrequencies))
    
  // The output of the regression reduction is a 4x1 array image
  var harmonicTrend = harmonicLandsat
    .select(independents.add(DEPENDENT))
    .reduce(ee.Reducer.linearRegression(independents.length(), 1))
  
  // Turn the array image into a multi-band image of coefficients
  var harmonicTrendCoefficients = harmonicTrend.select('coefficients')
    .arrayProject([0])
    .arrayFlatten([independents])
  
  // Get RMS from linearRegression result
  var rmse = harmonicTrend.select('residuals')
    .arrayProject([0])
    .arrayFlatten([ee.List(['rmse'])])

  harmonicTrendCoefficients = harmonicTrendCoefficients
    .addBands([rmse, numObs])
    .setDefaultProjection(crs);
    
  var outputProperties = ee.Dictionary({
    'WRS_PATH': feature.get('PATH'),
    'crs': crs
});
  
  return harmonicTrendCoefficients
    .setMulti(outputProperties);
};


// ------------------------------------- Analysis -------------------------------------- 

// Get specified frequencies
if (HARMONICS == 'h13') {
  var harmonicFrequencies = ee.List([1,3]);
} else if (HARMONICS == 'h12') {
  var harmonicFrequencies = ee.List([1,2]);
}
  
// Construct lists of names for the harmonic terms
var cosNames = getNames('cos_', harmonicFrequencies);
var sinNames = getNames('sin_', harmonicFrequencies);

// Make list of  variables
var independents = ee.List(['constant', 't'])
  .cat(cosNames).cat(sinNames);

// Select all available (full) versus limited L7 (16d) time series
if (TS == 'full') {
  
  // Get all Landsat 5 imagery.
  var collection5 = ee.ImageCollection('LANDSAT/LT05/C01/T1_SR')
    .filterBounds(roi)
    .filterDate(START_YEAR + '-01-01', END_YEAR + '-12-31') // WINDOW
    .filter(ee.Filter.lt('CLOUD_COVER_LAND', CC_THRESH))
    .map(preprocess457);
  
  // Get all Landsat 7 imagery
  var collection7 = ee.ImageCollection('LANDSAT/LE07/C01/T1_SR')
    .filterBounds(roi)
    .filterDate(START_YEAR + '-01-01', END_YEAR + '-12-31') // WINDOW
    .filter(ee.Filter.lt('CLOUD_COVER_LAND', CC_THRESH))
    .map(preprocess457);
  
  // Get all Landsat 8 imagery.
  var collection8 = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
    .filterBounds(roi)
    .filterDate(START_YEAR + '-01-01', END_YEAR + '-12-31') // WINDOW
    .filter(ee.Filter.lt('CLOUD_COVER_LAND', CC_THRESH))
    .map(preprocess8);
    
} else if (TS == '16d') {
  
  // Get all Landsat 5 imagery.
  var collection5 = ee.ImageCollection('LANDSAT/LT05/C01/T1_SR')
    .filterBounds(roi)
    .filterDate(1985 + '-01-01', 2011 + '-10-31')  // Landsat 5 fails Nov. 2011
    .filterDate(START_YEAR + '-01-01', END_YEAR + '-12-31') // WINDOW
    .filter(ee.Filter.lt('CLOUD_COVER_LAND', CC_THRESH))
    .map(preprocess457);
  
  // Get Landsat 7 imagery to fill gap period between 5 and 8.
  var collection7 = ee.ImageCollection('LANDSAT/LE07/C01/T1_SR')
    .filterBounds(roi)
    .filterDate(2011 + '-11-01', 2013 + '-04-10') // Use Landsat 7 only when 5/8 not avail.
    .filterDate(START_YEAR + '-01-01', END_YEAR + '-12-31') // WINDOW
    .filter(ee.Filter.lt('CLOUD_COVER_LAND', CC_THRESH))
    .map(preprocess457);
  
  // Get all Landsat 8 imagery.
  var collection8 = ee.ImageCollection('LANDSAT/LC08/C01/T1_SR')
    .filterBounds(roi)
    .filterDate(2013 + '-04-11', 2020 + '-12-31') // Landsat 8 achieves WRS-2 April 11, 2013
    .filterDate(START_YEAR + '-01-01', END_YEAR + '-12-31') // WINDOW
    .filter(ee.Filter.lt('CLOUD_COVER_LAND', CC_THRESH))
    .map(preprocess8);
}

// Merge pre-processed Landsat 5, 7 and 8 collections
var collection = collection5.merge(collection7).merge(collection8)
  .map(addCloudScore)
  .map(maskCloudScore) // mask based on simple cloud score
  .map(spectralTransforms)
  .sort('system:time_start');
print(collection)

// Get WRS2 Scene boundaries
var scenes = wrs2.filterBounds(roi);

// Join images by Scene (Path/Row)
var join = ee.Join.saveAll('images', 'system:time_start', true)
var collections = join.apply({
primary: scenes, 
secondary: collection, 
condition: ee.Filter.and(
  ee.Filter.equals({
    leftField: 'PATH', 
    rightField: 'WRS_PATH'
  }), ee.Filter.equals({
    leftField: 'ROW', 
    rightField: 'WRS_ROW'
  })
)
})

// Map over scene collections
var outputFull = ee.ImageCollection(collections.map(getCoeffs));
print('Full collection:', outputFull);

var paths = outputFull.aggregate_array('WRS_PATH').distinct().sort()
var num_paths = paths.size().getInfo()
print(paths)
var path_start = paths.get(0).getInfo()
var path_stop = paths.get(num_paths-1).getInfo()

for(var path = path_start; path <= path_stop; path++){
  print(path)
  var images = outputFull.filterMetadata('WRS_PATH', 'equals', path)
  var path_proj = images.first().projection()
  
    // Quality mosaic based on number of observations per pixel
  var outputMosaic = ee.Image(images
    .qualityMosaic('nobs')
    .multiply(OUTPUT_MULTIPLIER)
    .int() 
    .clip(roi)
    .setMulti(outputProperties))
    .set('WRS_PATH', path);

  print('Mosaic product:', outputMosaic);
  
  Map.addLayer(outputMosaic.select('rmse'), {min:0, max:500}, 'RMSE');
    
  Export.image.toAsset({
    image: outputMosaic,
    description: DEPENDENT + '_' + START_YEAR + '-' + END_YEAR + '-' + path,
    assetId: output_name + '_p' + path,
    region: roi.bounds(),
    crs: path_proj,
    scale: 30,
    maxPixels: 1e13,
  })
}

Map.addLayer(image.select('rmse'), {min:0, max:500}, 'RMSE - exported');

