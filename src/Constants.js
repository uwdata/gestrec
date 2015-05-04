/**
 * Constants.
 */
module.exports = {
  // ignore sequence information
  SEQUENCE_INVARIANT: 1,
  // when SEQUENCE_SENSITIVE is used, only single stroke gestures are currently allowed
  SEQUENCE_SENSITIVE: 2,

  // ORIENTATION_SENSITIVE and ORIENTATION_INVARIANT are only for SEQUENCE_SENSITIVE gestures
  ORIENTATION_INVARIANT: 1,
  // at most 2 directions can be recognized
  ORIENTATION_SENSITIVE: 2,
  // at most 4 directions can be recognized
  ORIENTATION_SENSITIVE_4: 4,
  // at most 8 directions can be recognized
  ORIENTATION_SENSITIVE_8: 8,

  SEQUENCE_SAMPLE_SIZE: 16,

  PATCH_SAMPLE_SIZE: 16,

  ORIENTATIONS: [
    0,
    (Math.PI / 4),
    (Math.PI / 2),
    (Math.PI * 3 / 4),
    Math.PI,
    -0,
    (-Math.PI / 4),
    (-Math.PI / 2),
    (-Math.PI * 3 / 4),
    -Math.PI
  ]
};