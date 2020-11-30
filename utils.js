// |
// | Utility functions for Forest Condition Monitoring Workflow
// | [valpasq@bu.edu], 2020
// |
// |

// ---------------------------- LANDSAT Pre-processing ---------------------------- 


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

// ------------------------- Simple Cloud Score for SR ------------------------- 
// SOURCE: https://gis.stackexchange.com/questions/280400/
// cloud-cover-percentage-in-google-earth-engine  


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

}


var maskCloudScore = function(image) {
  var qa = image.select('cloudscore');

  var mask = qa.gte(0.8);
  return image.updateMask(mask)
      .copyProperties(image, ["system:time_start", "WRS_PATH", "WRS_ROW"]);
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


var spectralTransformsFnFactory = function(dependent) {
  return function(img){
    // Make sure index string is in upper case
    
    var scaled = img.divide(10000);
  
    var dict = {
      blue: scaled.select("blue"),
      green: scaled.select("green"), 
      red: scaled.select("red"),
      nir: scaled.select("nir"),
      swir1: scaled.select("swir1"),
      swir2: scaled.select("swir2"),
    };
    
    var indexImg;
    switch (dependent.toUpperCase()){
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
      .copyProperties(img, ["system:time_start", "WRS_PATH", "WRS_ROW", "SENSING_TIME"]);
  };
}


var addHarmonicsFnFactory = function(freqs, cosNames, sinNames) {
  return function(image) {
    // Make an image of frequencies.
    var frequencies = ee.Image.constant(freqs)
    // This band should represent time in radians.
    var time = ee.Image(image).select('t');
    // Get the cosine terms.
    var cosines = time.multiply(frequencies).cos().rename(cosNames);
    // Get the sin terms.
    var sines = time.multiply(frequencies).sin().rename(sinNames);
    return image.addBands(cosines).addBands(sines);
  };
};

////

// Function to add predicted value
var addPredictionFnFactory = function(independents, model) {
  return function(image) {
    var prediction = image.select(independents)
      .multiply(model.select(independents))
      // .reduce('sum')
      .arrayReduce(ee.Reducer.sum(), [0])
      // .arrayGet([0])
      .rename('prediction')
    var rmse = model.select('rmse').rename('rmse')
    var nobs = model.select('nobs').rename('nobs')
    var t = model.select('t').rename('trend')
    return image.addBands(prediction)
        .addBands(rmse).addBands(nobs).addBands(t);
  };
}


// -------------------------------- Export -------------------------------- 

exports = {
  getNames: getNames,
  addConstant: addConstant,
  addTime: addTime,
  addHarmonicsFnFactory: addHarmonicsFnFactory,
  preprocess457: preprocess457,
  preprocess8: preprocess8,
  cloudScore: cloudScore,
  addCloudScore: addCloudScore,
  maskCloudScore: maskCloudScore,
  spectralTransformsFnFactory: spectralTransformsFnFactory,
  addPredictionFnFactory: addPredictionFnFactory
}
