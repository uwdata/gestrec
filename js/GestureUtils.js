/**
 * Utility functions for gesture processing & analysis, including methods for:
 * <ul> 
 * <li>feature extraction (e.g., samplers and those for calculating bounding
 * boxes and gesture path lengths);
 * <li>geometric transformation (e.g., translation, rotation and scaling);
 * <li>gesture similarity comparison (e.g., calculating Euclidean or Cosine
 * distances between two gestures).
 * </ul>
 */
var GestureUtils = {};

GestureUtils.CALING_THRESHOLD = 0.26;
GestureUtils.NONUNIFORM_SCALE = Math.sqrt(2);

GestureUtils.zeroes = function(n) {
  var array = Array(n);
  for (var i=0; i<n; ++i) array[i] = 0;
  return array;
}

/**
 * Samples the gesture spatially by rendering the gesture into a 2D 
 * grayscale bitmap. Scales the gesture to fit the size of the bitmap. 
 * 
 * @param gesture the gesture to be sampled
 * @param bitmapSize the size of the bitmap
 * @param keepAspectRatio if the scaling should keep the gesture's 
 *        aspect ratio
 * 
 * @return a bitmapSize x bitmapSize grayscale bitmap that is represented 
 *         as a 1D array. The float at index i represents the grayscale 
 *         value at pixel [i%bitmapSize, i/bitmapSize] 
 */
GestureUtils.spatialSampling = function(gesture, bitmapSize, keepAspectRatio) {
  var targetPatchSize = bitmapSize - 1;
  var sample = GestureUtils.zeroes(bitmapSize * bitmapSize);
  var rect = gesture.getBoundingBox();
  var gestureWidth = rect.width();
  var gestureHeight = rect.height();
  var sx = targetPatchSize / gestureWidth;
  var sy = targetPatchSize / gestureHeight;
  var scale;

  if (keepAspectRatio) {
    scale = sx < sy ? sx : sy;
    sx = scale;
    sy = scale;
  } else {
    var aspectRatio = gestureWidth / gestureHeight;
    if (aspectRatio > 1) {
      aspectRation = 1 / aspectRatio;
    }
    if (aspectRatio < GestureUtils.SCALING_THRESHOLD) {
      scale = sx < sy ? sx : sy;
      sx = scale;
      sy = scale;
    } else {
      if (sx > sy) {
        scale = sy * GestureUtils.NONUNIFORM_SCALE;
        if (scale < sx) { sx = scale; }
      } else {
        scale = sx * GestureUtils.NONUNIFORM_SCALE; 
        if (scale < sy) { sy = scale; }
      }
    }
  }

  var preDx = -rect.centerX();
  var preDy = -rect.centerY();
  var postDx = targetPatchSize / 2;
  var postDy = targetPatchSize / 2;
  var strokes = gesture.getStrokes();
  var count = strokes.length;
  var size; // int
  var xpos;
  var ypos;

  for (var index=0; index < count; index++) {
    var stroke = strokes[index];
    var strokepoints = stroke.points;
    size = strokepoints.length;
    var pts = Array(size);
    for (var i=0; i < size; i += 2) {
      pts[i] = (strokepoints[i] + preDx) * sx + postDx;
      pts[i + 1] = (strokepoints[i + 1] + preDy) * sy + postDy;
    }
    var segmentEndX = -1;
    var segmentEndY = -1;
    for (var i=0; i < size; i += 2) {
      var segmentStartX = pts[i] < 0 ? 0 : pts[i];
      var segmentStartY = pts[i + 1] < 0 ? 0 : pts[i + 1];
      if (segmentStartX > targetPatchSize) {
        segmentStartX = targetPatchSize;
      } 
      if (segmentStartY > targetPatchSize) {
        segmentStartY = targetPatchSize;
      }
      plot(segmentStartX, segmentStartY, sample, bitmapSize);
      if (segmentEndX != -1) {
        // Evaluate horizontally
        if (segmentEndX > segmentStartX) {
          xpos = Math.ceil(segmentStartX);
          var slope = (segmentEndY - segmentStartY) / (segmentEndX - segmentStartX);
          while (xpos < segmentEndX) {
            ypos = slope * (xpos - segmentStartX) + segmentStartY;
            plot(xpos, ypos, sample, bitmapSize); 
            xpos++;
          }
        } else if (segmentEndX < segmentStartX) {
          xpos = Math.ceil(segmentEndX);
          var slope = (segmentEndY - segmentStartY) / (segmentEndX - segmentStartX);
          while (xpos < segmentStartX) {
              ypos = slope * (xpos - segmentStartX) + segmentStartY;
              plot(xpos, ypos, sample, bitmapSize); 
              xpos++;
          }
        }
        // Evaluate vertically
        if (segmentEndY > segmentStartY) {
          ypos = Math.ceil(segmentStartY);
          var invertSlope = (segmentEndX - segmentStartX) / (segmentEndY - segmentStartY);
          while (ypos < segmentEndY) {
              xpos = invertSlope * (ypos - segmentStartY) + segmentStartX;
              plot(xpos, ypos, sample, bitmapSize); 
              ypos++;
          }
        } else if (segmentEndY < segmentStartY) {
          ypos = Math.ceil(segmentEndY);
          var invertSlope = (segmentEndX - segmentStartX) / (segmentEndY - segmentStartY);
          while (ypos < segmentStartY) {
            xpos = invertSlope * (ypos - segmentStartY) + segmentStartX; 
            plot(xpos, ypos, sample, bitmapSize); 
            ypos++;
          }
        }
      }
      segmentEndX = segmentStartX;
      segmentEndY = segmentStartY;
    }
  }
  return sample;
};

GestureUtils.plot = function(x, y, sample, sampleSize) {
  x = x < 0 ? 0 : x;
  y = y < 0 ? 0 : y;
  var xFloor = Math.floor(x);
  var xCeiling = Math.ceil(x);
  var yFloor = Math.floor(y);
  var yCeiling = Math.ceil(y);
  
  // if it's an integer
  if (x == xFloor && y == yFloor) {
    var index = yCeiling * sampleSize + xCeiling;
    if (sample[index] < 1){
      sample[index] = 1;
    }
  } else {
    var xFloorSq = Math.pow(xFloor - x, 2);
    var yFloorSq = Math.pow(yFloor - y, 2);
    var xCeilingSq = Math.pow(xCeiling - x, 2);
    var yCeilingSq = Math.pow(yCeiling - y, 2);
    var topLeft = Math.sqrt(xFloorSq + yFloorSq);
    var topRight = Math.sqrt(xCeilingSq + yFloorSq);
    var btmLeft = Math.sqrt(xFloorSq + yCeilingSq);
    var btmRight = Math.sqrt(xCeilingSq + yCeilingSq);
    var sum = topLeft + topRight + btmLeft + btmRight;
    
    var value = topLeft / sum;
    var index = yFloor * sampleSize + xFloor;
    if (value > sample[index]){
      sample[index] = value;
    }
    
    value = topRight / sum;
    index = yFloor * sampleSize + xCeiling;
    if (value > sample[index]){
      sample[index] = value;
    }
    
    value = btmLeft / sum;
    index = yCeiling * sampleSize + xFloor;
    if (value > sample[index]){
      sample[index] = value;
    }
    
    value = btmRight / sum;
    index = yCeiling * sampleSize + xCeiling;
    if (value > sample[index]){
      sample[index] = value;
    }
  }
};

/**
 * Samples a stroke temporally into a given number of evenly-distributed 
 * points.
 * 
 * @param stroke the gesture stroke to be sampled
 * @param numPoints the number of points
 * @return the sampled points in the form of [x1, y1, x2, y2, ..., xn, yn]
 */
GestureUtils.temporalSampling = function(stroke, numPoints) {
  var increment = stroke.length / (numPoints - 1);
  var vectorLength = numPoints * 2;
  var vector = Array(vectorLength);
  var distanceSoFar = 0;
  var pts = stroke.points;
  var lstPointX = pts[0];
  var lstPointY = pts[1];
  var index = 0;
  var currentPointX = Number.MIN_VALUE;
  var currentPointY = Number.MIN_VALUE;
  vector[index] = lstPointX;
  index++;
  vector[index] = lstPointY;
  index++;
  var i = 0;
  var count = pts.length / 2;
  while (i < count) {
    if (currentPointX == Number.MIN_VALUE) {
      i++;
      if (i >= count) {
        break;
      }
      currentPointX = pts[i * 2];
      currentPointY = pts[i * 2 + 1];
    }
    var deltaX = currentPointX - lstPointX;
    var deltaY = currentPointY - lstPointY;
    var distance = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
    if (distanceSoFar + distance >= increment) {
      var ratio = (increment - distanceSoFar) / distance;
      var nx = lstPointX + ratio * deltaX;
      var ny = lstPointY + ratio * deltaY;
      vector[index] = nx;
      index++;
      vector[index] = ny;
      index++;
      lstPointX = nx;
      lstPointY = ny;
      distanceSoFar = 0;
    } else {
      lstPointX = currentPointX;
      lstPointY = currentPointY;
      currentPointX = Number.MIN_VALUE;
      currentPointY = Number.MIN_VALUE;
      distanceSoFar += distance;
    }
  }

  for (i = index; i < vectorLength; i += 2) {
    vector[i] = lstPointX;
    vector[i + 1] = lstPointY;
  }
  return vector;
};

/**
 * Calculates the centroid of a set of points.
 * 
 * @param points the points in the form of [x1, y1, x2, y2, ..., xn, yn]
 * @return the centroid
 */
GestureUtils.computeCentroid = function(points) {
  var centerX = 0;
  var centerY = 0;
  var count = points.length;
  for (var i=0; i<count; ++i) {
    centerX += points[i];
    i++;
    centerY += points[i];
  }
  return [
    2 * centerX / count,
    2 * centerY / count
  ];
};

/**
 * Calculates the variance-covariance matrix of a set of points.
 * 
 * @param points the points in the form of [x1, y1, x2, y2, ..., xn, yn]
 * @return the variance-covariance matrix
 */
GestureUtils.computeCoVariance = function(points) {
  var array = [[0,0], [0,0]];
  var count = points.length;
  for (var i=0; i<count; ++i) {
    var x = points[i];
    i++;
    var y = points[i];
    array[0][0] += x * x;
    array[0][1] += x * y;
    array[1][0] = array[0][1];
    array[1][1] += y * y;
  }
  array[0][0] /= (count / 2);
  array[0][1] /= (count / 2);
  array[1][0] /= (count / 2);
  array[1][1] /= (count / 2);
  return array;
};

GestureUtils.computeTotalLength = function(points) {
  var sum = 0;
  var count = points.length - 4;
  for (var i=0; i<count; i+=2) {
      var dx = points[i + 2] - points[i];
      var dy = points[i + 3] - points[i + 1];
      sum += Math.sqrt(dx*dx + dy*dy);
  }
  return sum;
};

GestureUtils.computeStraightness = function(points) {
  var totalLen = GestureUtils.computeTotalLength(points);
  var dx = points[2] - points[0];
  var dy = points[3] - points[1];
  return Math.sqrt(dx*dx + dy*dy) / totalLen;
};

GestureUtils.computeStraightness = function(points, totalLen) {
  var dx = points[2] - points[0];
  var dy = points[3] - points[1];
  return Math.sqrt(dx*dx + dy*dy) / totalLen;
};

/**
 * Calculates the squared Euclidean distance between two vectors.
 * 
 * @param vector1
 * @param vector2
 * @return the distance
 */
GestureUtils.squaredEuclideanDistance = function(vector1, vector2) {
  var squaredDistance = 0;
  var size = vector1.length;
  for (var i=0; i<size; ++i) {
    var difference = vector1[i] - vector2[i];
    squaredDistance += difference * difference;
  }
  return squaredDistance / size;
};

/**
 * Calculates the cosine distance between two instances.
 * 
 * @param vector1
 * @param vector2
 * @return the distance between 0 and Math.PI
 */
GestureUtils.cosineDistance = function(vector1, vector2) {
  var sum = 0;
  var len = vector1.length;
  for (var i=0; i<len; ++i) {
    sum += vector1[i] * vector2[i];
  }
  return Math.acos(sum);
};

/**
 * Calculates the "minimum" cosine distance between two instances.
 * 
 * @param vector1
 * @param vector2
 * @param numOrientations the maximum number of orientation allowed
 * @return the distance between the two instances (between 0 and Math.PI)
 */
GestureUtils.minimumCosineDistance = function(vector1, vector2, numOrientations) {
  var len = vector1.length;
  var a = 0;
  var b = 0;
  for (var i = 0; i < len; i += 2) {
    a += vector1[i] * vector2[i] + vector1[i + 1] * vector2[i + 1];
    b += vector1[i] * vector2[i + 1] - vector1[i + 1] * vector2[i];
  }
  if (a != 0) {
    var tan = b/a;
    var angle = Math.atan(tan);
    if (numOrientations > 2 && Math.abs(angle) >= Math.PI / numOrientations) {
      return Math.acos(a);
    } else {
      var cosine = Math.cos(angle);
      var sine = cosine * tan; 
      return Math.acos(a * cosine + b * sine);
    }
  } else {
    return Math.PI / 2;
  }
};

/**
 * Computes an oriented, minimum bounding box of a set of points.
 * 
 * @param originalPoints
 * @return an oriented bounding box
 */
GestureUtils.computeOrientedBoundingBoxPoints = function(originalPoints) {
  var count = originalPoints.length;
  var points = Array(count * 2);
  for (var i = 0; i < count; i++) {
      var point = originalPoints[i];
      var index = i * 2;
      points[index] = point.x;
      points[index + 1] = point.y;
  }
  var meanVector = GestureUtils.computeCentroid(points);
  return GestureUtils.computeOrientedBoundingBoxFull(points, meanVector);
};

/**
 * Computes an oriented, minimum bounding box of a set of points.
 * 
 * @param originalPoints
 * @return an oriented bounding box
 */
GestureUtils.computeOrientedBoundingBox = function(originalPoints) {
  var size = originalPoints.length;
  var points = Array(size);
  for (var i = 0; i < size; i++) {
    points[i] = originalPoints[i];
  }
  var meanVector = GestureUtils.computeCentroid(points);
  return GestureUtils.computeOrientedBoundingBoxFull(points, meanVector);
};

GestureUtils.computeOrientedBoundingBoxFull = function(points, centroid) {
  GestureUtils.translate(points, -centroid[0], -centroid[1]);

  var array = GestureUtils.computeCoVariance(points);
  var targetVector = GestureUtils.computeOrientation(array);

  var angle;
  if (targetVector[0] == 0 && targetVector[1] == 0) {
    angle = -Math.PI/2;
  } else { // -PI<alpha<PI
    angle = Math.atan2(targetVector[1], targetVector[0]);
    GestureUtils.rotate(points, -angle);
  }

  var minx = Number.MAX_VALUE;
  var miny = Number.MAX_VALUE;
  var maxx = Number.MIN_VALUE;
  var maxy = Number.MIN_VALUE;
  var count = points.length;
  for (var i = 0; i < count; i++) {
    if (points[i] < minx) {
      minx = points[i];
    }
    if (points[i] > maxx) {
      maxx = points[i];
    }
    i++;
    if (points[i] < miny) {
      miny = points[i];
    }
    if (points[i] > maxy) {
      maxy = points[i];
    }
  }

  return new OrientedBoundingBox(
    (angle * 180 / Math.PI),
    centroid[0],
    centroid[1],
    maxx - minx,
    maxy - miny
  );
};

GestureUtils.computeOrientation = function(covarianceMatrix) {
  var targetVector = [0, 0];
  if (covarianceMatrix[0][1] == 0 || covarianceMatrix[1][0] == 0) {
    targetVector[0] = 1;
    targetVector[1] = 0;
  }

  var a = -covarianceMatrix[0][0] - covarianceMatrix[1][1];
  var b = covarianceMatrix[0][0] * covarianceMatrix[1][1] - covarianceMatrix[0][1]
        * covarianceMatrix[1][0];
  var value = a / 2;
  var rightside = Math.sqrt(Math.pow(value, 2) - b);
  var lambda1 = -value + rightside;
  var lambda2 = -value - rightside;
  if (lambda1 == lambda2) {
    targetVector[0] = 0;
    targetVector[1] = 0;
  } else {
    var lambda = lambda1 > lambda2 ? lambda1 : lambda2;
    targetVector[0] = 1;
    targetVector[1] = (lambda - covarianceMatrix[0][0]) / covarianceMatrix[0][1];
  }
  return targetVector;
};


GestureUtils.rotate = function(points, angle) {
  var cos = Math.cos(angle);
  var sin = Math.sin(angle);
  var size = points.length;
  for (var i = 0; i < size; i += 2) {
    var x = points[i] * cos - points[i + 1] * sin;
    var y = points[i] * sin + points[i + 1] * cos;
    points[i] = x;
    points[i + 1] = y;
  }
  return points;
};

GestureUtils.translate = function(points, dx, dy) {
  var size = points.length;
  for (var i = 0; i < size; i += 2) {
    points[i] += dx;
    points[i + 1] += dy;
  }
  return points;
};

GestureUtils.scale = function(points, sx, sy) {
  var size = points.length;
  for (var i = 0; i < size; i += 2) {
    points[i] *= sx;
    points[i + 1] *= sy;
  }
  return points;
};
