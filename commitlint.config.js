/** @type {import('@commitlint/types').UserConfig} */
module.exports = {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Only these three types are allowed
    "type-enum": [2, "always", ["refactor", "feature", "bug"]],
    "type-case": [2, "always", "lower-case"],
    "type-empty": [2, "never"],
    "subject-empty": [2, "never"],
    "subject-case": [0],
    "header-max-length": [2, "always", 100],
  },
};
