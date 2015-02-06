/**
 * The abstract class of a gesture learner
 */
function Learner() {
  this.mInstances = [];
}

/**
 * Add an instance to the learner
 * 
 * @param instance
 */
Learner.prototype.addInstance = function(instance) {
  this.mInstances.push(instance);
};

/**
 * Retrieve all the instances
 * 
 * @return instances
 */
Learner.prototype.getInstances = function() {
  return this.mInstances;
};

/**
 * Remove an instance based on its id
 * 
 * @param id
 */
Learner.prototype.removeInstance = function(id) {
  instances = this.mInstances;
  var count = instances.length;
  for (var i = 0; i < count; i++) {
    var instance = instances[i];
    if (id === instance.id) {
      instances.splice(i, 1);
      return;
    }
  }
};

/**
 * Remove all the instances of a category
 * 
 * @param name the category name
 */
Learner.prototype.removeInstances = function(name) {
  var toDelete = [];
  var instances = this.mInstances;
  var count = instances.length;
  for (var i = 0; i < count; ++i) {
    var instance = instances[i];
    // the label can be null, as specified in Instance
    if ((instance.label == null && name == null)
          || (instance.label != null && instance.label === name)) {
      toDelete.push(i);
    }
  }
  for (i=toDelete.length-1; i>=0; --i) {
    instances.splice(toDelete[i], 1);
  }
};

Learner.prototype.classify = function(sequenceType, orientationType, vector) {
};
